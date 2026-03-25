'use client';

import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ProgressBar from './ui/ProgressBar';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// File size limit: 10MB for standard file uploads
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const UploadFileModal: React.FC<UploadFileModalProps> = ({ isOpen, onClose }) => {
  const { project, addFiles } = useContext(AppContext);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deliverableId, setDeliverableId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileSizeError(null);
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      const invalidFiles: File[] = [];

      // Validate file size (10MB limit per file)
      newFiles.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const errorMsg = invalidFiles.length === 1
          ? `File '${invalidFiles[0].name}' exceeds 10MB limit.`
          : `${invalidFiles.length} files exceed the 10MB limit.`;
        setFileSizeError(errorMsg);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setSelectedFiles([]);
    setDeliverableId('');
    setDescription('');
    setIsUploading(false);
    setUploadProgress(0);
    setFileSizeError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleClose = () => {
    clearForm();
    onClose();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    // Fix Bug #11: Documented mock file upload behavior
    // NOTE: This is intentional mock/demo behavior for the prototype.
    // In production, replace this with actual file upload to server:
    // - Use FormData to send file to backend
    // - Track real upload progress with XMLHttpRequest.upload or fetch
    // - Handle upload errors and cancellation
    // Current behavior: Simulates upload progress for UX demonstration

    const interval = setInterval(() => {
      setUploadProgress(prevProgress => {
        if (prevProgress >= 95) {
          clearInterval(interval);
          return prevProgress;
        }
        return prevProgress + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);

      const filesData = selectedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        deliverableId: deliverableId || undefined,
        description: description.trim() || undefined,
      }));

      addFiles(filesData);

      setTimeout(() => {
        handleClose();
      }, 500);

    }, 2200);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isUploading ? `Uploading ${selectedFiles.length} File(s)` : "Upload New Files"}>
      {isUploading ? (
        <div className="space-y-4 py-4">
          <p className="truncate text-center font-medium text-gray-800 dark:text-gray-200" title={selectedFiles.map(f => f.name).join(', ')}>
            Uploading {selectedFiles.length} file(s)...
          </p>
          <ProgressBar progress={uploadProgress} />
          <p className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
            {Math.round(uploadProgress)}% Complete
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Files
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center w-full">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf,.docx,.txt"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  {fileSizeError && (
                    <p className="text-sm text-red-500 font-medium mt-2">{fileSizeError}</p>
                  )}
                  {!fileSizeError && selectedFiles.length === 0 && (
                    <p className="text-xs text-gray-500">PNG, JPG, PDF, DOCX, TXT up to 10MB</p>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2 text-left max-h-32 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Selected Files ({selectedFiles.length})</p>
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                          <span className="truncate text-gray-700 dark:text-gray-200">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="file-deliverable" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Link to Deliverable (Optional)
              </label>
              <select
                id="file-deliverable"
                value={deliverableId}
                onChange={(e) => setDeliverableId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">General Project File</option>
                {project?.scope.deliverables.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="file-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </label>
              <textarea
                id="file-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., 'Initial draft of the hero section animation.'"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={selectedFiles.length === 0}>
                Upload File
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UploadFileModal;

