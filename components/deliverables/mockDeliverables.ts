/**
 * Mock Deliverable Data for Demo Purposes
 *
 * This file contains realistic mock data for demonstrating the deliverable approval flow.
 * Includes deliverables in various states and rich feedback examples.
 */

import { Deliverable, DeliverableApproval, RevisionQuota } from '../../types/deliverable.types';

/**
 * Mock deliverables for a project
 * Includes various states to showcase the complete workflow
 */
export const MOCK_DELIVERABLES: Deliverable[] = [
  // 1. BETA READY - Main demo deliverable (client can review this)
  {
    id: 'del-001',
    projectId: '5823632',
    title: 'Final Product Video',
    description: '2-minute product explainer video showcasing features and benefits',
    type: 'Video',
    status: 'beta_ready',
    progress: 85,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    betaFileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    watermarked: true,
    duration: '2:45',
    format: 'MP4',
    resolution: '1920x1080',
    approvalHistory: [],
    finalFileUrl: undefined,
    finalDeliveredAt: undefined,
    expiresAt: undefined,
  },

  // 2. AWAITING APPROVAL - Client needs to take action
  {
    id: 'del-002',
    projectId: '5823632',
    title: 'Social Media Cuts (9:16)',
    description: 'Vertical video formats optimized for Instagram, TikTok, and YouTube Shorts',
    type: 'Video',
    status: 'awaiting_approval',
    progress: 90,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    betaFileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    watermarked: true,
    duration: '0:45',
    format: 'MP4',
    resolution: '1080x1920',
    approvalHistory: [],
    finalFileUrl: undefined,
    finalDeliveredAt: undefined,
    expiresAt: undefined,
  },

  // 3. REJECTED - Example with rich feedback to showcase feedback system
  {
    id: 'del-003',
    projectId: '5823632',
    title: 'Brand Animation Intro',
    description: '10-second animated logo reveal for video intros',
    type: 'Video',
    status: 'rejected',
    progress: 70,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    betaFileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    watermarked: true,
    duration: '0:10',
    format: 'MP4',
    resolution: '1920x1080',
    approvalHistory: [
      {
        id: 'appr-001',
        deliverableId: 'del-003',
        action: 'rejected',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        userId: 'user-client-1',
        userName: 'Sarah Johnson',
        userEmail: 'sarah@example.com',
        feedback: 'The animation feels too slow and the colors don\'t match our updated brand guidelines. The blue needs to be more vibrant (#0066FF), and the animation should be punchier - maybe 7 seconds instead of 10.',
        timestampedComments: [
          {
            id: 'comment-001',
            timestamp: 2.5,
            comment: 'Logo reveal starts too slowly here - needs more energy',
            resolved: false,
          },
          {
            id: 'comment-002',
            timestamp: 5.0,
            comment: 'This blue color (#0052CC) should be updated to our new brand blue (#0066FF)',
            resolved: false,
          },
          {
            id: 'comment-003',
            timestamp: 8.0,
            comment: 'Consider adding a subtle sound effect for the logo lock-up',
            resolved: false,
          },
        ],
        issueCategories: ['color', 'timing', 'audio'],
        priority: 'important',
        attachments: [
          {
            id: 'att-001',
            fileName: 'brand-guidelines-2025.pdf',
            fileSize: 2457600, // 2.4 MB
            fileType: 'application/pdf',
            url: '/mock/attachments/brand-guidelines.pdf',
            thumbnailUrl: undefined,
          },
          {
            id: 'att-002',
            fileName: 'reference-animation.mp4',
            fileSize: 5242880, // 5 MB
            fileType: 'video/mp4',
            url: '/mock/attachments/reference.mp4',
            thumbnailUrl: '/mock/attachments/reference-thumb.jpg',
          },
        ],
      },
    ],
    finalFileUrl: undefined,
    finalDeliveredAt: undefined,
    expiresAt: undefined,
  },

  // 4. APPROVED - Simple approval for contrast
  {
    id: 'del-004',
    projectId: '5823632',
    title: 'Script & Concept Document',
    description: 'Approved creative concept and final script',
    type: 'Document',
    status: 'approved',
    progress: 100,
    dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    betaFileUrl: '/mock/files/script-beta.pdf',
    watermarked: false,
    duration: undefined,
    format: 'PDF',
    resolution: undefined,
    approvalHistory: [
      {
        id: 'appr-002',
        deliverableId: 'del-004',
        action: 'approved',
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        userId: 'user-client-1',
        userName: 'Sarah Johnson',
        userEmail: 'sarah@example.com',
        feedback: 'Looks great! The script captures our brand voice perfectly. Ready to proceed with production.',
      },
    ],
    finalFileUrl: '/mock/files/script-final.pdf',
    finalDeliveredAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 347 * 24 * 60 * 60 * 1000), // 365 - 18 days
  },

  // 5. FINAL DELIVERED - Success state with download
  {
    id: 'del-005',
    projectId: '5823632',
    title: 'Behind the Scenes B-Roll',
    description: 'Raw footage for social media and website use',
    type: 'Video',
    status: 'final_delivered',
    progress: 100,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    betaFileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    watermarked: false,
    duration: '3:20',
    format: 'MP4',
    resolution: '3840x2160',
    approvalHistory: [
      {
        id: 'appr-003',
        deliverableId: 'del-005',
        action: 'approved',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        userId: 'user-client-1',
        userName: 'Sarah Johnson',
        userEmail: 'sarah@example.com',
        feedback: 'Perfect! The footage quality is excellent and will work great for our marketing campaigns.',
      },
    ],
    finalFileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    finalDeliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 363 * 24 * 60 * 60 * 1000),
  },
];

/**
 * Mock revision quota for the project
 * Shows realistic usage (2 of 3 revisions used)
 */
export const MOCK_REVISION_QUOTA: RevisionQuota = {
  total: 3,
  used: 2,
  remaining: 1,
};

/**
 * Helper function to get deliverables by status
 */
export function getDeliverablesByStatus(status: string): Deliverable[] {
  if (status === 'all') return MOCK_DELIVERABLES;
  return MOCK_DELIVERABLES.filter(d => d.status === status);
}

/**
 * Helper function to get a single deliverable by ID
 */
export function getDeliverableById(id: string): Deliverable | undefined {
  return MOCK_DELIVERABLES.find(d => d.id === id);
}
