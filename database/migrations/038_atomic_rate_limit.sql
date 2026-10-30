-- UP
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_identifier text, p_action text, p_window_ms integer, p_max_requests integer
) RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz, retry_after integer)
LANGUAGE plpgsql VOLATILE SET search_path = pg_catalog, public AS $$
DECLARE
  v_now timestamptz;
  v_count integer;
  v_oldest timestamptz;
  v_created timestamptz;
  v_inserted integer;
BEGIN
  IF p_identifier IS NULL OR p_action IS NULL OR p_window_ms IS NULL OR p_max_requests IS NULL
     OR p_window_ms <= 0 OR p_max_requests <= 0 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Rate limiter requires read committed isolation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(length(p_identifier)::text || ':' || p_identifier || p_action, 0));
  v_now := clock_timestamp();
  SELECT count(*)::integer, min(e.created_at)
    INTO v_count, v_oldest
    FROM public.rate_limit_entries e
    WHERE e.identifier = p_identifier AND e.action = p_action
      AND e.created_at > v_now - p_window_ms * interval '1 millisecond';

  IF v_count >= p_max_requests THEN
    RETURN QUERY SELECT false, 0, v_now + p_window_ms * interval '1 millisecond',
      greatest(1, ceil(extract(epoch FROM (v_oldest + p_window_ms * interval '1 millisecond' - v_now)))::integer);
    RETURN;
  END IF;

  v_created := v_now;
  FOR attempt IN 1..10 LOOP
    INSERT INTO public.rate_limit_entries (identifier, action, created_at)
      VALUES (p_identifier, p_action, v_created) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    EXIT WHEN v_inserted = 1;
    v_created := v_created + interval '1 microsecond';
  END LOOP;
  IF v_inserted <> 1 THEN
    RAISE EXCEPTION 'Could not record rate limit entry';
  END IF;

  RETURN QUERY SELECT true, p_max_requests - v_count - 1,
    v_now + p_window_ms * interval '1 millisecond', NULL::integer;
END;
$$;

-- DOWN
DROP FUNCTION IF EXISTS public.consume_rate_limit(text, text, integer, integer);
