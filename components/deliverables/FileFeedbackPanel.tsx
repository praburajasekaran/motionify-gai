import React, { useEffect, useState } from 'react';
import { Button } from '../ui/design-system';

interface FileFeedback {
  id: string;
  file_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  video_timestamp: number | null;
  created_at: string;
}

export function FileFeedbackPanel({ deliverableId, fileId, fileName, canComment }: {
  deliverableId: string; fileId: string; fileName: string; canComment: boolean;
}) {
  const [comments, setComments] = useState<FileFeedback[]>([]);
  const [body, setBody] = useState('');
  const [timestamp, setTimestamp] = useState('0');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async (signal?: AbortSignal) => {
    const result = await fetch(`/api/deliverable-feedback?deliverableId=${deliverableId}&fileId=${fileId}`, { credentials: 'include', signal });
    if (!result.ok) throw new Error('Could not load file feedback. Reload to try again.');
    setComments(await result.json());
  };
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [deliverableId, fileId]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/deliverable-feedback', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableId, fileId, body,
          ...(replyTo ? { kind: 'reply', parentId: replyTo } : { kind: 'comment', timestamp: Number(timestamp) }) }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save feedback. Try again.');
      setBody('');
      setReplyTo(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save feedback. Try again.'); }
    finally { setSaving(false); }
  };
  const attribution = (comment: FileFeedback) => (
    <p className="text-xs text-muted-foreground">{comment.author_name} · {new Date(comment.created_at).toLocaleString()}</p>
  );
  return (
    <section aria-label="File discussion" className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">File discussion</h2>
        <p className="text-sm text-muted-foreground break-words"><span className="break-all">{fileName}</span>. Comments stay with this upload. Discussion does not use a revision.</p>
      </div>
      {loading && <p role="status">Loading feedback...</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && comments.length === 0 && <p className="text-sm text-muted-foreground">No comments on this file yet.</p>}
      {comments.filter(comment => !comment.parent_id).map(comment => (
        <article key={comment.id} className="border border-border rounded-lg p-3 space-y-2">
          {attribution(comment)}
          <p className="text-xs font-mono">At {Math.floor((comment.video_timestamp || 0) / 60)}:{Math.floor((comment.video_timestamp || 0) % 60).toString().padStart(2, '0')}</p>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
          {comments.filter(reply => reply.parent_id === comment.id).map(reply => (
            <div key={reply.id} className="ml-4 border-l-2 border-border pl-3 space-y-1">
              {attribution(reply)}
              <p className="text-sm whitespace-pre-wrap break-words">{reply.body}</p>
            </div>
          ))}
          {canComment && <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setReplyTo(comment.id); setBody(''); }}>Reply to comment</Button>}
        </article>
      ))}
      {canComment && !loading && (
        <form onSubmit={submit} className="space-y-3">
          {replyTo ? (
            <div className="text-sm">Replying to a comment <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setReplyTo(null); setBody(''); }}>Cancel reply</Button></div>
          ) : (
            <label className="block text-sm">Video timestamp in seconds
              <input type="number" min="0" max="86400" step="0.1" required value={timestamp} disabled={saving} onChange={event => setTimestamp(event.target.value)} className="block mt-1 rounded border border-border bg-background p-2 w-32" />
            </label>
          )}
          <label className="block text-sm">{replyTo ? 'Reply' : 'Comment on this file'}
            <textarea required maxLength={2000} value={body} disabled={saving} onChange={event => setBody(event.target.value)} className="block mt-1 w-full rounded border border-border bg-background p-2" rows={3} />
          </label>
          <Button type="submit" disabled={saving || !body.trim()}>{saving ? 'Saving...' : replyTo ? 'Post reply' : 'Post comment'}</Button>
        </form>
      )}
    </section>
  );
}
