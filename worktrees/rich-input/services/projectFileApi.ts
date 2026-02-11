import { api } from '../lib/api-config';
import type { ProjectFile } from '../types';

interface ProjectFileResponse {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  key: string;
  uploadedBy: string;
  uploadedByName: string | null;
  uploadedAt: string;
}

/**
 * Fetch all files for a project
 */
export async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await api.get<ProjectFileResponse[]>(`/project-files?projectId=${projectId}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch project files');
  }

  return response.data.map((f) => ({
    id: f.id,
    projectId: f.projectId,
    name: f.name,
    type: f.type || '',
    size: f.size || 0,
    key: f.key,
    uploadedBy: {
      id: f.uploadedBy,
      name: f.uploadedByName || 'Unknown',
      email: '',
      avatar: '',
      role: 'team_member' as const,
    },
    uploadedAt: f.uploadedAt,
  }));
}

/**
 * Create a project file record (after uploading to R2)
 */
export async function createProjectFile(data: {
  projectId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  r2Key: string;
}): Promise<ProjectFileResponse> {
  const response = await api.post<ProjectFileResponse>('/project-files', data);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to create project file record');
  }

  return response.data;
}

/**
 * Delete a project file
 */
export async function deleteProjectFile(fileId: string): Promise<void> {
  const response = await api.delete(`/project-files/${fileId}`);

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete project file');
  }
}
