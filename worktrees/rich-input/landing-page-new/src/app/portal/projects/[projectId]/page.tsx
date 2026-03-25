'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProjectOverview from '@/lib/portal/components/ProjectOverview';

export default function ProjectHomePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const handleDeliverableSelect = (deliverableId: string) => {
    // Navigate to tasks view with deliverable filter
    router.push(`/portal/projects/${projectId}/tasks?deliverable=${deliverableId}`);
  };

  return <ProjectOverview onSelectDeliverable={handleDeliverableSelect} />;
}
