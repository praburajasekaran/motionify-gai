export interface ProjectRequest {
  id: string;
  request_number: string;
  title: string;
  description: string;
  tentative_deadline: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'converted' | 'cancelled';
  client_name: string | null;
  client_email: string;
  inquiry_id: string | null;
  inquiry_number: string | null;
  created_at: string;
}

const endpoint = '/.netlify/functions/client-project-request';

export async function getProjectRequests(): Promise<ProjectRequest[]> {
  const response = await fetch(endpoint, { credentials: 'include' });
  if (!response.ok) throw new Error('Could not load client requests');
  return response.json();
}

export async function moveProjectRequestToInquiries(requestId: string): Promise<{ inquiryId: string }> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
    body: JSON.stringify({ requestId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not move the request to Inquiries');
  return result;
}
