'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TaskList from '@/lib/portal/components/TaskList';

export default function TasksPage() {
  const searchParams = useSearchParams();
  const deliverableId = searchParams.get('deliverable');

  const [focusedDeliverableId, setFocusedDeliverableId] = useState<string | null>(deliverableId);

  // Update focused deliverable when URL changes
  useEffect(() => {
    setFocusedDeliverableId(deliverableId);
  }, [deliverableId]);

  return (
    <TaskList
      focusedDeliverableId={focusedDeliverableId}
      setFocusedDeliverableId={setFocusedDeliverableId}
    />
  );
}
