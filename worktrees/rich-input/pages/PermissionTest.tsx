/**
 * Permission Test Page
 *
 * Interactive test environment for the 5-role permission system.
 * Allows switching between user roles and testing all permission scenarios.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  Upload,
  Download,
  CheckSquare,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { User, UserRole, Project, DeliverableStatus, USER_ROLE_LABELS } from '@/types';
import { Deliverable } from '../types/deliverable.types';
import {
  canViewDeliverable,
  canUploadBetaFiles,
  canUploadFinalFiles,
  canApproveDeliverable,
  canRequestRevisions,
  canViewApprovalHistory,
  canAccessFinalFiles,
  canEditDeliverable,
  canCreateDeliverable,
  canDeleteDeliverable,
  canViewBetaFiles,
  canCommentOnDeliverable,
  isClientPrimaryContact,
  isMotionifyTeam,
  getPermissionDeniedReason,
} from '@/utils/deliverablePermissions';
import { Button, Badge } from '../components/ui/design-system';

// ============================================================================
// MOCK DATA FOR TESTING
// ============================================================================

const TEST_PROJECT: Project = {
  id: 'project-test-1',
  title: 'Test Project - Acme Corp Video Campaign',
  client: 'Acme Corporation',
  thumbnail: 'https://via.placeholder.com/300x200',
  status: 'Active',
  dueDate: '2025-02-15',
  startDate: '2025-01-01',
  progress: 65,
  description: 'Test project for permission validation',
  tasks: [],
  team: [],
  budget: 50000,
  files: [],
  deliverables: [],
  deliverablesCount: 8,
  revisionCount: 2,
  maxRevisions: 5,
  activityLog: [],
};

const TEST_USERS: Record<string, User> = {
  super_admin: {
    id: 'user-admin',
    name: 'Admin User',
    email: 'admin@motionify.studio',
    role: 'super_admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    projectTeamMemberships: {},
  },
  project_manager: {
    id: 'user-pm',
    name: 'John Support',
    email: 'john@motionify.studio',
    role: 'project_manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    projectTeamMemberships: {},
  },
  team_member: {
    id: 'user-team',
    name: 'Sarah Designer',
    email: 'sarah@motionify.studio',
    role: 'team_member',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    projectTeamMemberships: {},
  },
  client_primary: {
    id: 'user-client-pm',
    name: 'Alex Client (Primary)',
    email: 'alex@acmecorp.com',
    role: 'client',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    projectTeamMemberships: {
      'project-test-1': {
        projectId: 'project-test-1',
        isPrimaryContact: true,
        joinedAt: '2025-01-01',
      },
    },
  },
  client_team: {
    id: 'user-client-team',
    name: 'Bob Viewer',
    email: 'bob@acmecorp.com',
    role: 'client',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    projectTeamMemberships: {
      'project-test-1': {
        projectId: 'project-test-1',
        isPrimaryContact: false,
        joinedAt: '2025-01-02',
      },
    },
  },
};

// Create test deliverables for each status
const TEST_DELIVERABLES: Deliverable[] = [
  {
    projectId: 'project-test-1',
    id: 'del-1',
    title: 'Intro Animation',
    description: 'Opening sequence animation',
    type: 'Video',
    status: 'pending' as DeliverableStatus,
    progress: 30,
    dueDate: '2025-01-20',
    betaFileUrl: '',
    watermarked: true,
    approvalHistory: [],
    duration: '0:15',
    format: 'MP4',
    resolution: '1920x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-2',
    title: 'Product Demo',
    description: 'Product feature demonstration',
    type: 'Video',
    status: 'in_progress' as DeliverableStatus,
    progress: 60,
    dueDate: '2025-01-22',
    betaFileUrl: '',
    watermarked: true,
    approvalHistory: [],
    duration: '1:30',
    format: 'MP4',
    resolution: '1920x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-3',
    title: 'Brand Story',
    description: 'Company brand narrative video',
    type: 'Video',
    status: 'beta_ready' as DeliverableStatus,
    progress: 90,
    dueDate: '2025-01-25',
    betaFileUrl: 'https://example.com/beta/brand-story.mp4',
    watermarked: true,
    approvalHistory: [],
    duration: '2:00',
    format: 'MP4',
    resolution: '1920x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-4',
    title: 'Customer Testimonial',
    description: 'Customer success story',
    type: 'Video',
    status: 'awaiting_approval' as DeliverableStatus,
    progress: 100,
    dueDate: '2025-01-27',
    betaFileUrl: 'https://example.com/beta/testimonial.mp4',
    watermarked: true,
    approvalHistory: [
      {
        id: 'appr-1',
        deliverableId: 'del-4',
        action: 'submitted_for_approval' as any, // Cast as any if type check fails, or change to valid 'approved' | 'rejected' if logic allows. Sticking to 'approved' for safety based on type definition.
        timestamp: new Date('2025-01-15'),
        userId: 'user-pm',
        userName: 'John Manager',
        userEmail: 'john@motionify.studio',
      },
    ],
    duration: '1:45',
    format: 'MP4',
    resolution: '1920x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-5',
    title: 'Social Media Clips',
    description: 'Short clips for social media',
    type: 'Video',
    status: 'approved' as DeliverableStatus,
    progress: 100,
    dueDate: '2025-01-30',
    betaFileUrl: 'https://example.com/beta/social.mp4',
    watermarked: false,
    approvalHistory: [
      {
        id: 'appr-2',
        deliverableId: 'del-5',
        action: 'approved',
        timestamp: new Date('2025-01-16'),
        userId: 'user-client-pm',
        userName: 'Alex Client',
        userEmail: 'alex@acmecorp.com',
      },
    ],
    duration: '0:30',
    format: 'MP4',
    resolution: '1080x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-6',
    title: 'Explainer Video',
    description: 'Product explainer animation',
    type: 'Video',
    status: 'rejected' as DeliverableStatus,
    progress: 85,
    dueDate: '2025-02-01',
    betaFileUrl: 'https://example.com/beta/explainer.mp4',
    watermarked: true,
    approvalHistory: [
      {
        id: 'appr-3',
        deliverableId: 'del-6',
        action: 'rejected',
        timestamp: new Date('2025-01-17'),
        userId: 'user-client-pm',
        userName: 'Alex Client',
        userEmail: 'alex@acmecorp.com',
        feedback: 'Color scheme needs adjustment',
      },
    ],
    duration: '1:15',
    format: 'MP4',
    resolution: '1920x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-7',
    title: 'Tutorial Series - Part 1',
    description: 'Educational tutorial video',
    type: 'Video',
    status: 'payment_pending' as DeliverableStatus,
    progress: 100,
    dueDate: '2025-02-05',
    betaFileUrl: 'https://example.com/beta/tutorial-1.mp4',
    watermarked: false,
    approvalHistory: [
      {
        id: 'appr-4',
        deliverableId: 'del-7',
        action: 'approved',
        timestamp: new Date('2025-01-18'),
        userId: 'user-client-pm',
        userName: 'Alex Client',
        userEmail: 'alex@acmecorp.com',
      },
    ],
    duration: '3:00',
    format: 'MP4',
    resolution: '1920x1080',
  },
  {
    projectId: 'project-test-1',
    id: 'del-8',
    title: 'Corporate Presentation',
    description: 'Executive presentation video',
    type: 'Video',
    status: 'final_delivered' as DeliverableStatus,
    progress: 100,
    dueDate: '2025-02-10',
    betaFileUrl: 'https://example.com/beta/presentation.mp4',
    finalFileUrl: 'https://example.com/final/presentation.mp4',
    // deliveredAt removed
    expiresAt: new Date('2026-01-20'),
    watermarked: false,
    approvalHistory: [
      {
        id: 'appr-5',
        deliverableId: 'del-8',
        action: 'approved',
        timestamp: new Date('2025-01-19'),
        userId: 'user-client-pm',
        userName: 'Alex Client',
        userEmail: 'alex@acmecorp.com',
      },
      {
        id: 'appr-6',
        deliverableId: 'del-8',
        action: 'approved',
        timestamp: new Date('2025-01-20'),
        userId: 'user-pm',
        userName: 'John Manager',
        userEmail: 'john@motionify.studio',
      },
    ],
    duration: '5:00',
    format: 'MP4',
    resolution: '1920x1080',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function PermissionTest() {
  const [currentRole, setCurrentRole] = useState<UserRole>('client_primary');
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable>(TEST_DELIVERABLES[3]); // awaiting_approval

  const currentUser = TEST_USERS[currentRole] || TEST_USERS.client_primary;

  // Calculate permissions for selected deliverable
  const permissions = {
    canView: canViewDeliverable(currentUser, selectedDeliverable, TEST_PROJECT),
    canUploadBeta: canUploadBetaFiles(currentUser, TEST_PROJECT),
    canUploadFinal: canUploadFinalFiles(currentUser, TEST_PROJECT),
    canApprove: canApproveDeliverable(currentUser, selectedDeliverable, TEST_PROJECT),
    canReject: canRequestRevisions(currentUser, selectedDeliverable, TEST_PROJECT),
    canViewHistory: canViewApprovalHistory(currentUser, TEST_PROJECT),
    canAccessFinal: canAccessFinalFiles(currentUser, selectedDeliverable, TEST_PROJECT),
    canEdit: canEditDeliverable(currentUser, selectedDeliverable, TEST_PROJECT),
    canCreate: canCreateDeliverable(currentUser, TEST_PROJECT),
    canDelete: canDeleteDeliverable(currentUser, TEST_PROJECT),
    canViewBeta: canViewBetaFiles(currentUser, selectedDeliverable, TEST_PROJECT),
    canComment: canCommentOnDeliverable(currentUser, selectedDeliverable, TEST_PROJECT),
    isClientPM: isClientPrimaryContact(currentUser, TEST_PROJECT.id),
    isTeam: isMotionifyTeam(currentUser),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Permission System Test
              </h1>
              <p className="text-slate-600 text-sm">
                Test all 5 roles against 8 deliverable statuses
              </p>
            </div>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-5 gap-3 mt-6">
            {Object.entries(TEST_USERS).map(([roleKey, user]) => (
              <button
                key={roleKey}
                onClick={() => setCurrentRole(user.role === 'client' && user.projectTeamMemberships?.['project-test-1']?.isPrimaryContact ? 'client_primary' : user.role as UserRole)}
                className={`p-4 rounded-lg border-2 transition-all ${currentRole === (user.role === 'client' && user.projectTeamMemberships?.['project-test-1']?.isPrimaryContact ? 'client_primary' : user.role)
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">
                      {USER_ROLE_LABELS[user.role]}
                      {user.role === 'client' && user.projectTeamMemberships?.['project-test-1']?.isPrimaryContact && ' (PM)'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Deliverables List */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Test Deliverables (All Statuses)
            </h2>
            <div className="space-y-3">
              {TEST_DELIVERABLES.map((deliverable) => {
                const canView = canViewDeliverable(currentUser, deliverable as any, TEST_PROJECT);

                return (
                  <button
                    key={deliverable.id}
                    onClick={() => setSelectedDeliverable(deliverable)}
                    disabled={!canView}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedDeliverable.id === deliverable.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : canView
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {canView ? (
                            <Eye className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          )}
                          <h3 className="font-semibold text-sm text-slate-900">
                            {deliverable.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600">{deliverable.description}</p>
                      </div>
                      <Badge
                        variant={
                          deliverable.status === 'final_delivered'
                            ? 'success'
                            : deliverable.status === 'rejected'
                              ? 'destructive'
                              : deliverable.status === 'awaiting_approval'
                                ? 'warning'
                                : 'default'
                        }
                        className="shrink-0 text-xs"
                      >
                        {deliverable.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Permission Matrix */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Permission Matrix
            </h2>
            <div className="space-y-3">
              <PermissionRow
                icon={<Eye className="h-4 w-4" />}
                label="View Deliverable"
                granted={permissions.canView}
                reason={!permissions.canView ? getPermissionDeniedReason('view', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<Eye className="h-4 w-4" />}
                label="View Beta Files"
                granted={permissions.canViewBeta}
              />
              <PermissionRow
                icon={<Upload className="h-4 w-4" />}
                label="Upload Beta Files"
                granted={permissions.canUploadBeta}
                reason={!permissions.canUploadBeta ? getPermissionDeniedReason('upload_beta', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<Upload className="h-4 w-4" />}
                label="Upload Final Files"
                granted={permissions.canUploadFinal}
                reason={!permissions.canUploadFinal ? getPermissionDeniedReason('upload_final', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Approve Deliverable"
                granted={permissions.canApprove}
                reason={!permissions.canApprove ? getPermissionDeniedReason('approve', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<XCircle className="h-4 w-4" />}
                label="Request Revisions"
                granted={permissions.canReject}
                reason={!permissions.canReject ? getPermissionDeniedReason('reject', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<Clock className="h-4 w-4" />}
                label="View Approval History"
                granted={permissions.canViewHistory}
                reason={!permissions.canViewHistory ? getPermissionDeniedReason('view_history', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<Download className="h-4 w-4" />}
                label="Access Final Files"
                granted={permissions.canAccessFinal}
                reason={!permissions.canAccessFinal ? getPermissionDeniedReason('access_final', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<CheckSquare className="h-4 w-4" />}
                label="Edit Deliverable"
                granted={permissions.canEdit}
                reason={!permissions.canEdit ? getPermissionDeniedReason('edit', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<CheckSquare className="h-4 w-4" />}
                label="Create Deliverables"
                granted={permissions.canCreate}
                reason={!permissions.canCreate ? getPermissionDeniedReason('create', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<XCircle className="h-4 w-4" />}
                label="Delete Deliverables"
                granted={permissions.canDelete}
                reason={!permissions.canDelete ? getPermissionDeniedReason('delete', currentUser, selectedDeliverable, TEST_PROJECT) : undefined}
              />
              <PermissionRow
                icon={<UserIcon className="h-4 w-4" />}
                label="Comment on Deliverable"
                granted={permissions.canComment}
              />
            </div>

            {/* Role Info */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Role Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Is Client Primary Contact:</span>
                  <Badge variant={permissions.isClientPM ? 'success' : 'default'}>
                    {permissions.isClientPM ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Is Motionify Team:</span>
                  <Badge variant={permissions.isTeam ? 'success' : 'default'}>
                    {permissions.isTeam ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Deliverable Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Selected Deliverable Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Title</p>
              <p className="text-sm font-semibold text-slate-900">{selectedDeliverable.title}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <Badge variant="default">{selectedDeliverable.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Progress</p>
              <p className="text-sm font-semibold text-slate-900">{selectedDeliverable.progress}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Due Date</p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(selectedDeliverable.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        {/* Error Test Section */}
        <ErrorTestSection />
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// ============================================================================
// ERROR TEST COMPONENT
// ============================================================================

import { useQuery } from '@tanstack/react-query';

function ErrorTestSection() {
  const [shouldFail, setShouldFail] = useState(false);

  // This query will fail when shouldFail is true
  useQuery({
    queryKey: ['error-test'],
    queryFn: async () => {
      if (shouldFail) {
        throw new Error('Simulated API 500 Error');
      }
      return 'Success';
    },
    enabled: shouldFail,
    retry: false, // Fail immediately for testing
  });

  return (
    <div className="bg-red-50 rounded-xl shadow-lg p-6 border border-red-200 mt-8">
      <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
        <AlertCircle className="h-6 w-6" />
        Error Handling Test
      </h2>
      <p className="text-red-700 mb-4">
        Click the button below to simulate a component throwing an error during data fetching.
        This tests the global Error Boundary and React Query integration.
      </p>
      <Button
        variant="destructive"
        onClick={() => setShouldFail(true)}
      >
        Simulate 500 API Error
      </Button>
    </div>
  );
}

// ... existing PermissionRow component ...

interface PermissionRowProps {
  icon: React.ReactNode;
  label: string;
  granted: boolean;
  reason?: string;
}

function PermissionRow({ icon, label, granted, reason }: PermissionRowProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${granted
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-red-50 border-red-200'
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`${granted ? 'text-emerald-600' : 'text-red-600'
            }`}
        >
          {icon}
        </div>
        <div>
          <p className={`text-sm font-medium ${granted ? 'text-emerald-900' : 'text-red-900'
            }`}>
            {label}
          </p>
          {!granted && reason && (
            <p className="text-xs text-red-700 mt-0.5 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              {reason}
            </p>
          )}
        </div>
      </div>
      <div>
        {granted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </div>
    </div>
  );
}
