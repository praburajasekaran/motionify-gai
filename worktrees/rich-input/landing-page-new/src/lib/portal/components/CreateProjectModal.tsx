'use client';

import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Deliverable, Client } from '@/lib/portal/types';
import { generateDeliverableId } from '@/lib/portal/utils/idGenerator';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (data: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number }) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onAddProject }) => {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientLogoUrl, setClientLogoUrl] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [nonInclusions, setNonInclusions] = useState('');
  const [totalRevisions, setTotalRevisions] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim() || !deliverables.trim()) return;

    // Fix Bug #6: Validate totalRevisions is not NaN
    // Fix Bug #12: Validate totalRevisions is not negative
    const validatedRevisions = Number.isNaN(totalRevisions) || totalRevisions < 0 ? 0 : totalRevisions;

    const deliverablesData = deliverables.split('\n')
      .filter(item => item.trim() !== '')
      .map((name) => ({
        id: generateDeliverableId('del-new'),
        name,
      }));

    const scope = {
      deliverables: deliverablesData,
      nonInclusions: nonInclusions.split('\n').filter(item => item.trim() !== ''),
    };

    const client = {
      name: clientName,
      logoUrl: clientLogoUrl.trim() || undefined,
    }

    onAddProject({ name, client, scope, totalRevisions: validatedRevisions });
    onClose();
    setName('');
    setClientName('');
    setClientLogoUrl('');
    setDeliverables('');
    setNonInclusions('');
    setTotalRevisions(3);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Client Name
            </label>
            <input
              type="text"
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="client-logo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Client Logo URL (Optional)
            </label>
            <input
              type="url"
              id="client-logo"
              value={clientLogoUrl}
              onChange={(e) => setClientLogoUrl(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <label htmlFor="deliverables" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Deliverables
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Enter one deliverable per line.</p>
            <textarea
              id="deliverables"
              rows={4}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="non-inclusions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Non-Inclusions (Optional)
            </label>
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Enter one non-inclusion per line.</p>
            <textarea
              id="non-inclusions"
              rows={3}
              value={nonInclusions}
              onChange={(e) => setNonInclusions(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="revisions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Revisions
            </label>
            <input
              type="number"
              id="revisions"
              value={totalRevisions}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                // Fix Bug #6: Prevent NaN, default to 0
                setTotalRevisions(Number.isNaN(value) ? 0 : value);
              }}
              min="0"
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !clientName.trim() || !deliverables.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProjectModal;

