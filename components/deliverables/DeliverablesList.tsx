/**
 * DeliverablesList Component
 *
 * Grid view of all deliverables with:
 * - Filter by status
 * - Sort by due date, status, or updated
 * - Responsive grid layout (1/2/3 columns)
 * - Empty state
 */

import React from 'react';
import { Filter, ArrowUpDown, FileBox } from 'lucide-react';
import { Select, EmptyState, Button } from '../ui/design-system';
import { DeliverableCard } from './DeliverableCard';
import { Deliverable, DeliverableStatus } from '../../types/deliverable.types';
import { BatchUploadModal } from './BatchUploadModal';
import { Upload } from 'lucide-react';

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

      {/* Batch Upload Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setIsBatchModalOpen(true)}
        >
          <Upload className="h-4 w-4" />
          Batch Upload
        </Button>
      </div>

      <BatchUploadModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        deliverables={deliverables}
        onUploadComplete={() => window.location.reload()}
      />

      {/* Deliverables Grid */}
      {
        sortedDeliverables.length === 0 ? (
          <EmptyState
            title="No deliverables found"
            description={
              filter === 'all'
                ? 'This project does not have any deliverables yet.'
                : `No deliverables match the "${filterOptions.find((o) => o.value === filter)?.label}" filter.`
            }
            icon={FileBox}
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDeliverables.map((deliverable) => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
              />
            ))}
          </div>
        )
      }
    </div >
  );
};
