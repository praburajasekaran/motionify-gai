/**
 * DeliverablesList Component
 *
 * List view of all deliverables with:
 * - Filter by status
 * - Sort by due date, status, or updated
 * - Compact list layout
 * - Inline "Add New" card at bottom
 * - Empty state
 */

import React from 'react';
import { Filter, ArrowUpDown, FileBox, Plus } from 'lucide-react';
import { Select, EmptyState } from '../ui/design-system';
import { DeliverableListItem } from './DeliverableListItem';
import { Deliverable, DeliverableStatus } from '../../types/deliverable.types';
import { BatchUploadModal } from './BatchUploadModal';
import { AddDeliverableModal } from './AddDeliverableModal';
import { useDeliverables } from './DeliverableContext';
import { canCreateDeliverable } from '../../utils/deliverablePermissions';

export interface DeliverablesListProps {
  deliverables: Deliverable[];
  filter: DeliverableStatus | 'all';
  sortBy: 'dueDate' | 'status' | 'updated';
  onFilterChange: (filter: DeliverableStatus | 'all') => void;
  onSortChange: (sortBy: 'dueDate' | 'status' | 'updated') => void;
  className?: string;
}

export const DeliverablesList: React.FC<DeliverablesListProps> = ({
  deliverables,
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
  className,
}) => {
  const [isBatchModalOpen, setIsBatchModalOpen] = React.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const { currentProject, currentUser, refreshDeliverables } = useDeliverables();

  // Check if user can create deliverables
  const canCreate = currentUser && currentProject && canCreateDeliverable(currentUser, currentProject);

  // Filter deliverables
  const filteredDeliverables =
    filter === 'all'
      ? deliverables
      : deliverables.filter((d) => d.status === filter);

  // Sort deliverables
  const sortedDeliverables = [...filteredDeliverables].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      case 'updated':
        // For this demo, we'll use dueDate as a proxy for updated
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      default:
        return 0;
    }
  });

  // Filter and sort options
  const filterOptions = [
    { label: 'All Deliverables', value: 'all' },
    { label: 'Beta Ready', value: 'beta_ready' },
    { label: 'Awaiting Approval', value: 'awaiting_approval' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Final Delivered', value: 'final_delivered' },
    { label: 'Pending', value: 'pending' },
  ];

  const sortOptions = [
    { label: 'Due Date', value: 'dueDate' },
    { label: 'Status', value: 'status' },
    { label: 'Recently Updated', value: 'updated' },
  ];

  return (
    <div className={className}>
      {/* Filters & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700">Filter</span>
          </div>
          <Select
            value={filter}
            onValueChange={(value) => onFilterChange(value as DeliverableStatus | 'all')}
            options={filterOptions}
            placeholder="All Deliverables"
          />
        </div>

        <div className="flex-1 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700">Sort By</span>
          </div>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as 'dueDate' | 'status' | 'updated')}
            options={sortOptions}
            placeholder="Due Date"
          />
        </div>

        {/* Result Count */}
        <div className="flex items-end">
          <p className="text-sm text-zinc-500">
            Showing <span className="font-semibold text-zinc-900">{sortedDeliverables.length}</span>{' '}
            of <span className="font-semibold text-zinc-900">{deliverables.length}</span>{' '}
            deliverable{deliverables.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <AddDeliverableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectId={currentProject?.id || ''}
        onSuccess={() => {
          refreshDeliverables();
        }}
      />

      <BatchUploadModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        deliverables={deliverables}
        onUploadComplete={() => window.location.reload()}
      />

      {/* Deliverables List */}
      {sortedDeliverables.length === 0 && filter !== 'all' ? (
        <EmptyState
          title="No deliverables found"
          description={`No deliverables match the "${filterOptions.find((o) => o.value === filter)?.label}" filter.`}
          icon={FileBox}
          className="py-16"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedDeliverables.map((deliverable) => (
            <DeliverableListItem
              key={deliverable.id}
              deliverable={deliverable}
            />
          ))}

          {/* Inline Add New Card */}
          {canCreate && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-300 rounded-lg text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add New Deliverable</span>
            </button>
          )}

          {/* Empty state when no deliverables and filter is 'all' */}
          {sortedDeliverables.length === 0 && filter === 'all' && !canCreate && (
            <EmptyState
              title="No deliverables yet"
              description="This project does not have any deliverables yet."
              icon={FileBox}
              className="py-16"
            />
          )}
        </div>
      )}
    </div>
  );
};
