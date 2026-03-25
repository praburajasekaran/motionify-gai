'use client';

import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface RequestRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RequestRevisionModal: React.FC<RequestRevisionModalProps> = ({ isOpen, onClose, onConfirm }) => {

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Additional Revision">
        <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                You have used all your included revisions. Additional revisions can be purchased and will be added to your next invoice.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Please confirm that you would like to proceed with requesting one additional revision.
            </p>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm}>
              Confirm & Add Revision
            </Button>
          </div>
        </div>
    </Modal>
  );
};

export default RequestRevisionModal;

