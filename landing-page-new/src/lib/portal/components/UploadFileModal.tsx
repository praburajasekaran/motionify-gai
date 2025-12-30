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

const UploadFileModal: React.FC<UploadFileModalProps> = ({ isOpen, onClose }) => {
  const { project, addFile } = useContext(AppContext);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deliverableId, setDeliverableId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const clearForm = () => {
    setSelectedFile(null);
    setDeliverableId('');
    setDescription('');
    setIsUploading(false);
    setUploadProgress(0);
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
    if (!selectedFile) return;

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

      addFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        deliverableId: deliverableId || undefined,
        description: description.trim() || undefined,
      });

      setTimeout(() => {
        handleClose();
      }, 500);

    }, 2200);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isUploading ? "Uploading File" : "Upload a New File"}>
      {isUploading ? (
        <div className="space-y-4 py-4">
          <p className="truncate text-center font-medium text-gray-800 dark:text-gray-200" title={selectedFile?.name}>
            {selectedFile?.name}
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
                Select File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} ref={fileInputRef} required />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  {selectedFile ? (
                      <p className="text-sm text-gray-500">{selectedFile.name}</p>
                  ) : (
                      <p className="text-xs text-gray-500">Any file type, up to 500MB</p>
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
              <Button type="submit" disabled={!selectedFile}>
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

