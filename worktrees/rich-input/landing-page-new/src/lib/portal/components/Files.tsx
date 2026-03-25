'use client';

import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import { ProjectFile, UserRole } from '@/lib/portal/types';
import Card from './ui/Card';
import Button from './ui/Button';
import FileItem from './FileItem';
import UploadFileModal from './UploadFileModal';


const Files = () => {
  const { project, currentUser } = useContext(AppContext);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const groupedFiles = useMemo(() => {
    if (!project) return {};
    
    const groups: Record<string, ProjectFile[]> = {};

    project.files.forEach(file => {
      const key = file.deliverableId || 'general';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(file);
    });
    return groups;

  }, [project]);

  if (!project) {
    return (
      <Card title="Project Files">
        <p className="text-white/60">No project selected.</p>
      </Card>
    );
  }

  const headerActions = currentUser ? (
    <Button onClick={() => setIsUploadModalOpen(true)}>Upload File</Button>
  ) : null;
  
  return (
    <>
      <Card title="Project Files" headerActions={headerActions}>
        {project.files.length > 0 ? (
          <div className="space-y-8">
            {project.scope.deliverables.map(deliverable => {
              const filesForDeliverable = groupedFiles[deliverable.id];
              if (!filesForDeliverable || filesForDeliverable.length === 0) {
                return null;
              }
              return (
                <div key={deliverable.id}>
                  <h3 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-white/10">{deliverable.name}</h3>
                  <div className="space-y-3">
                    {filesForDeliverable.map(file => (
                      <FileItem key={file.id} file={file} />
                    ))}
                  </div>
                </div>
              );
            })}

            {groupedFiles['general'] && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-white/10">General Project Files</h3>
                <div className="space-y-3">
                  {groupedFiles['general'].map(file => (
                    <FileItem key={file.id} file={file} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-white">No files uploaded</h3>
            <p className="mt-1 text-sm text-white/60">Get started by uploading project deliverables or documents.</p>
          </div>
        )}
      </Card>
      <UploadFileModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
};

export default Files;

