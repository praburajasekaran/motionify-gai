import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export function NotFound({ portal = false }: { portal?: boolean }) {
  return (
    <main className="portal-shell min-h-dvh flex items-center justify-center bg-background px-6 py-12 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
          <FileQuestion className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-2">404</p>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Page not found</h1>
        <p className="mt-3 text-muted-foreground">This link may have changed. Check the address or return {portal ? 'to your workspace' : 'to Motionify Studio'}.</p>
        <Link to="/" reloadDocument className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-[var(--studio-amber-hover)]">
          {portal ? 'Back to workspace' : 'Back to home'}
        </Link>
      </div>
    </main>
  );
}
