# 2026-05-23 — payment verify used undefined DB client

## What Happened

While implementing Project Access after advance payment, the frontend `/payments/verify` path was found to call `acceptProposalAndCreateProject(client, payment.id)` even though no `client` existed in that scope. The webhook path used a real transaction client, so online payment activation could work only if the webhook recovered the frontend failure.

## Root Cause

Project activation logic was extracted to a helper that expects a transaction-capable DB client, but `payments.ts` continued using pool-level queries and never created/passed a client for verify or manual completion.

## Impact

- Severity: P1
- Time lost: 20 minutes

## Fix

Wrapped payment completion plus Project Activation in the existing `transaction()` helper and passed the transaction client to `acceptProposalAndCreateProject`.

## Prevention Rule

When a shared helper requires a DB client, every caller should either already be inside a transaction or use a wrapper that creates one before invoking the helper.

## Tags

`payments` `transactions` `project-activation`
