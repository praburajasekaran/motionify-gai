'use client';

import React, { useState, useContext } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface RevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

const RevisionModal = ({ isOpen, onClose, taskId }: RevisionModalProps) => {
  const { project, requestRevision } = useContext(AppContext);
  const [details, setDetails] = useState('');

  if (!project) {
    return null;
  }
  
  const revisionsLeft = project.totalRevisions - project.usedRevisions;
  const canRequest = revisionsLeft > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim() || !canRequest) return;
    requestRevision(taskId, details);
    onClose();
    setDetails('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request a Revision">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {canRequest ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have {revisionsLeft} revision(s) remaining. Please provide clear and concise feedback below.
              </p>
              <div>
                <label htmlFor="revision-details" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Revision Details
                </label>
                <textarea
                  id="revision-details"
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., 'Please change the background color in the third scene to a lighter blue.'"
                  required
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              You have used all available revisions for this project. Please contact your project manager to discuss options for further changes.
            </p>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {canRequest && (
              <Button type="submit" disabled={!details.trim()}>
                Submit Request
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default RevisionModal;

