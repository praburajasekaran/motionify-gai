import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjectRequests, moveProjectRequestToInquiries, type ProjectRequest } from '../../lib/project-requests';

interface Props {
  searchTerm: string;
}

export function ProjectRequestQueue({ searchTerm }: Props) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    getProjectRequests()
      .then(setRequests)
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleRequests = requests.filter((request) => {
    const term = searchTerm.trim().toLowerCase();
    return !term || [request.request_number, request.title, request.client_name, request.client_email]
      .some((value) => value?.toLowerCase().includes(term));
  });

  const moveToInquiries = async (request: ProjectRequest) => {
    setMovingId(request.id);
    setError(null);
    try {
      const { inquiryId } = await moveProjectRequestToInquiries(request.id);
      navigate(`/admin/inquiries/${inquiryId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not move the request to Inquiries');
      setMovingId(null);
    }
  };

  return (
    <section className="bg-card rounded-xl ring-1 ring-border shadow-sm overflow-hidden" aria-labelledby="client-requests-heading">
      <div className="p-4 border-b border-border">
        <h2 id="client-requests-heading" className="text-lg font-semibold text-foreground">
          Client requests {loading ? '' : `(${requests.length})`}
        </h2>
        <p className="text-sm text-muted-foreground">Review a request in Inquiries before preparing a proposal.</p>
      </div>
      {error && <p role="alert" className="p-4 text-sm text-red-400">{error}</p>}
      {loading ? <p className="p-4 text-sm text-muted-foreground">Loading client requests...</p> : (
        visibleRequests.length === 0
          ? <p className="p-4 text-sm text-muted-foreground">No client requests found.</p>
          : <div className="divide-y divide-border">
              {visibleRequests.map((request) => (
                <div key={request.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-semibold text-foreground">{request.request_number}</code>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{request.status}</span>
                    </div>
                    <h3 className="mt-1 font-medium text-foreground">{request.title}</h3>
                    <p className="text-sm text-muted-foreground">{request.client_name || request.client_email} · {request.client_email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Due {new Date(request.tentative_deadline).toLocaleDateString()}</p>
                  </div>
                  {request.inquiry_id ? (
                    <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => navigate(`/admin/inquiries/${request.inquiry_id}`)}>
                      Open {request.inquiry_number || 'inquiry'}
                    </button>
                  ) : !['rejected', 'cancelled'].includes(request.status) ? (
                    <button type="button" disabled={movingId === request.id} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={() => moveToInquiries(request)}>
                      {movingId === request.id ? 'Moving...' : 'Move to Inquiries'}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
      )}
    </section>
  );
}
