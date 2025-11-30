# Data Models: Team Management

This document defines all TypeScript interfaces and types for Team Management (US-021, US-022).

## Table of Contents

1. [ProjectInvitation Model](#projectinvitation-model)
2. [ProjectTeamMember Model](#projectteammember-model)
3. [Supporting Models](#supporting-models)
4. [Request/Response Types](#requestresponse-types)
5. [Supporting Types](#supporting-types)
6. [Relationships](#relationships)
7. [Validation Rules](#validation-rules)
8. [Example Data](#example-data)

---

## ProjectInvitation Model

Represents an email invitation sent to invite a user to join a project team.

```typescript
export interface ProjectInvitation {
  // Core Identification
  id: string;                    // UUID (e.g., "inv_abc123...")
  token: string;                 // Unique secure token for acceptance link
  status: InvitationStatus;
  createdAt: Date;               // When invitation was sent
  updatedAt: Date;
  expiresAt: Date;               // 7 days from createdAt

  // Invitation Details
  email: string;                 // Email address of invitee
  personalMessage?: string;      // Optional message from inviter
  role: UserRole;                // Role to assign (usually 'client')

  // Relationships
  projectId: string;             // UUID of project
  invitedBy: string;             // UUID of user who sent invitation

  // Metadata
  acceptedAt?: Date;             // When invitation was accepted (if accepted)
  acceptedBy?: string;           // UUID of user who accepted (if accepted)
  revokedAt?: Date;              // When invitation was revoked (if revoked)
  revokedBy?: string;            // UUID of user who revoked (if revoked)
  resentAt?: Date;               // When invitation was last resent
  resentCount: number;           // Number of times resent (default: 0)
}
```

### InvitationStatus Type

```typescript
export type InvitationStatus =
  | 'pending'        // Sent, awaiting acceptance
  | 'accepted'       // User accepted and joined project
  | 'expired'        // 7 days passed without acceptance
  | 'revoked';       // Cancelled by primary contact/PM
```

---

## ProjectTeamMember Model

Represents a user who is a member of a project team.

```typescript
export interface ProjectTeamMember {
  // Core Identification
  id: string;                    // UUID (composite: user_id + project_id)
  createdAt: Date;               // When user was added to team
  updatedAt: Date;

  // Team Membership
  userId: string;                // UUID of user
  projectId: string;             // UUID of project
  role: UserRole;                // User's role on this project
  isPrimaryContact: boolean;     // True if this user is the primary contact

  // Metadata
  addedAt: Date;                 // When added to project (same as createdAt)
  addedBy: string;               // UUID of user who added them (or 'system' for invitation acceptance)
  invitationId?: string;         // UUID of invitation used to join (if via invitation)

  // Soft Delete (US-022)
  removedAt?: Date;              // When removed from project (null if active)
  removedBy?: string;            // UUID of user who removed them

  // Expanded Relations (for UI display)
  user?: User;                   // User details (populated via join)
  project?: Project;             // Project details (populated via join)
}
```

### UserRole Type

```typescript
export type UserRole =
  | 'super_admin'        // Motionify admin (full system access)
  | 'project_manager'    // Motionify PM (manages projects)
  | 'team_member'        // Motionify team member (limited to assigned tasks)
  | 'client';            // Client user (view/upload on their projects)
```

---

## Supporting Models

### User Interface (Subset for Team Management)

```typescript
export interface User {
  id: string;                    // UUID
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
}
```

### Project Interface (Subset for Team Management)

```typescript
export interface Project {
  id: string;                    // UUID
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: Date;
}
```

### TeamMemberWithUser (Extended View)

```typescript
export interface TeamMemberWithUser extends ProjectTeamMember {
  user: User;                    // Always populated for UI display
  isRemoved: boolean;            // Computed: removedAt !== null
  canBeRemoved: boolean;         // Computed based on business rules
}
```

### InvitationWithDetails (Extended View)

```typescript
export interface InvitationWithDetails extends ProjectInvitation {
  inviter: User;                 // User who sent the invitation
  project: Project;              // Project being invited to
  isExpired: boolean;            // Computed: expiresAt < now
  daysUntilExpiry: number;       // Computed: days until expiresAt
}
```

---

## Request/Response Types

### Create Invitation Request

```typescript
export interface CreateInvitationRequest {
  email: string;                 // Valid email address
  personalMessage?: string;      // Optional, max 500 chars
  role?: UserRole;               // Optional, defaults to 'client'
}
```

### Create Invitation Response

```typescript
export interface CreateInvitationResponse {
  invitation: ProjectInvitation;
  message: string;               // "Invitation sent to colleague@example.com"
}
```

### List Team Members Response

```typescript
export interface ListTeamMembersResponse {
  members: TeamMemberWithUser[];
  pendingInvitations: InvitationWithDetails[];
  totalMembers: number;
  totalInvitations: number;
}
```

### Accept Invitation Request

```typescript
export interface AcceptInvitationRequest {
  token: string;                 // Invitation token from URL
  userId?: string;               // UUID of authenticated user (if signing in)
}
```

### Accept Invitation Response

```typescript
export interface AcceptInvitationResponse {
  success: boolean;
  teamMember: ProjectTeamMember;
  redirectUrl: string;           // Where to redirect user (e.g., "/projects/proj_xyz")
  message: string;               // "Welcome to Brand Video Campaign!"
}
```

### Verify Invitation Request

```typescript
export interface VerifyInvitationRequest {
  token: string;                 // Invitation token from URL
}
```

### Verify Invitation Response

```typescript
export interface VerifyInvitationResponse {
  valid: boolean;
  email: string;
  projectName: string;
  inviterName: string;
  personalMessage?: string;
  expiresAt: Date;
  error?: string;                // If invalid, reason (e.g., "expired", "revoked")
}
```

### Remove Team Member Request

```typescript
export interface RemoveTeamMemberRequest {
  userId: string;                // UUID of user to remove
}
```

### Remove Team Member Response

```typescript
export interface RemoveTeamMemberResponse {
  success: boolean;
  removedUser: {
    id: string;
    name: string;
    email: string;
    removedAt: Date;
  };
  message: string;               // "Michael Chen has been removed from the project"
}
```

### Resend Invitation Response

```typescript
export interface ResendInvitationResponse {
  success: boolean;
  invitation: ProjectInvitation;
  message: string;               // "Invitation resent to david@acmecorp.com"
}
```

---

## Supporting Types

### Invitation Constraints

```typescript
export const INVITATION_CONSTRAINTS = {
  TOKEN_LENGTH: 32,              // Bytes for crypto.randomBytes
  EXPIRY_DAYS: 7,                // Days until invitation expires
  MAX_RESEND_PER_HOUR: 3,        // Max resends per invitation per hour
  MAX_PERSONAL_MESSAGE_LENGTH: 500,
} as const;
```

### Team Member Constraints

```typescript
export const TEAM_MEMBER_CONSTRAINTS = {
  MIN_TEAM_SIZE: 1,              // At least 1 PM required
  MAX_TEAM_SIZE: 50,             // Max team members per project
  DATA_RETENTION_DAYS: 90,       // Days to keep soft-deleted records
} as const;
```

### Invitation Email Template Data

```typescript
export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;        // If known (existing user)
  inviterName: string;
  projectName: string;
  projectDescription?: string;
  personalMessage?: string;
  acceptanceUrl: string;         // Full URL with token
  expiresAt: Date;
}
```

### Team Member Removal Email Data

```typescript
export interface RemovalEmailData {
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  removedBy: string;             // Name of person who removed them
  removedAt: Date;
  preservedContributions: {
    tasks: number;
    comments: number;
    files: number;
  };
}
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│     User        │
└────┬────────┬───┘
     │        │
     │        │ 1:N (invitedBy)
     │        │
     │        ↓
     │   ┌────────────────────┐
     │   │ ProjectInvitation  │
     │   └─────────┬──────────┘
     │             │
     │ 1:N         │ 1:1 (on acceptance)
     │             │
     ↓             ↓
┌────────────────────────┐         ┌──────────┐
│  ProjectTeamMember     │────────→│ Project  │
└────────────────────────┘   N:1   └──────────┘

Notes:
- User can send many invitations (invitedBy)
- User can be on many projects (ProjectTeamMember)
- Invitation becomes TeamMember on acceptance
- TeamMember links User to Project
```

### Invitation Lifecycle

```
┌─────────────────┐
│ User sends      │
│ invitation      │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────┐
│ ProjectInvitation created   │
│ status: 'pending'           │
│ expiresAt: now + 7 days     │
└───────────┬─────────────────┘
            │
            ↓
       ┌────────┐
       │ Email  │
       │ sent   │
       └────┬───┘
            │
    ┌───────┴────────┐
    │                │
    ↓                ↓
[Accepted]      [Not Accepted]
    │                │
    ↓                ↓
┌────────────┐  ┌──────────┐
│ status:    │  │ status:  │
│ 'accepted' │  │ 'expired'│
└─────┬──────┘  └──────────┘
      │
      ↓
┌─────────────────────┐
│ ProjectTeamMember   │
│ created             │
│ invitationId: [id]  │
└─────────────────────┘
```

---

## Validation Rules

### ProjectInvitation Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| email | Yes | - | - | Valid email |
| personalMessage | No | 0 | 500 | Any string |
| role | Yes | - | - | 'client', 'project_manager' |
| token | Yes (auto) | 32 | 32 | Hex string (crypto) |
| expiresAt | Yes (auto) | - | - | Date (createdAt + 7 days) |

### ProjectTeamMember Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| userId | Yes | - | - | Valid UUID |
| projectId | Yes | - | - | Valid UUID |
| role | Yes | - | - | UserRole enum |
| isPrimaryContact | Yes | - | - | Boolean |
| addedBy | Yes | - | - | Valid UUID or 'system' |

### Business Logic Validation

```typescript
export interface TeamValidationRules {
  // Invitation Creation
  canInviteUser(email: string, projectId: string): Promise<{
    valid: boolean;
    error?: 'already_member' | 'already_invited' | 'invalid_email';
  }>;

  // Team Member Removal
  canRemoveTeamMember(userId: string, projectId: string, removedBy: string): Promise<{
    valid: boolean;
    error?: 'cannot_remove_self' | 'cannot_remove_primary' | 'cannot_remove_last_pm' | 'no_permission';
  }>;

  // Invitation Acceptance
  canAcceptInvitation(token: string, userEmail: string): Promise<{
    valid: boolean;
    error?: 'expired' | 'revoked' | 'already_accepted' | 'email_mismatch' | 'invalid_token';
  }>;
}
```

### Zod Validation Schemas

```typescript
import { z } from 'zod';

// Invitation Status
export const InvitationStatusSchema = z.enum([
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

// User Role
export const UserRoleSchema = z.enum([
  'super_admin',
  'project_manager',
  'team_member',
  'client',
]);

// Create Invitation Request
export const CreateInvitationRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  personalMessage: z.string()
    .max(500, 'Personal message must be 500 characters or less')
    .optional(),
  role: UserRoleSchema.optional().default('client'),
});

// Project Invitation
export const ProjectInvitationSchema = z.object({
  id: z.string().uuid(),
  token: z.string().length(64), // 32 bytes = 64 hex chars
  status: InvitationStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),

  email: z.string().email(),
  personalMessage: z.string().max(500).optional(),
  role: UserRoleSchema,

  projectId: z.string().uuid(),
  invitedBy: z.string().uuid(),

  acceptedAt: z.date().optional(),
  acceptedBy: z.string().uuid().optional(),
  revokedAt: z.date().optional(),
  revokedBy: z.string().uuid().optional(),
  resentAt: z.date().optional(),
  resentCount: z.number().int().min(0).default(0),
});

// Project Team Member
export const ProjectTeamMemberSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),

  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: UserRoleSchema,
  isPrimaryContact: z.boolean(),

  addedAt: z.date(),
  addedBy: z.string(), // UUID or 'system'
  invitationId: z.string().uuid().optional(),

  removedAt: z.date().optional(),
  removedBy: z.string().uuid().optional(),
});

// Accept Invitation Request
export const AcceptInvitationRequestSchema = z.object({
  token: z.string().length(64),
  userId: z.string().uuid().optional(),
});

// Verify Invitation Request
export const VerifyInvitationRequestSchema = z.object({
  token: z.string().length(64),
});

// Remove Team Member Request
export const RemoveTeamMemberRequestSchema = z.object({
  userId: z.string().uuid(),
});

// Resend Invitation (no body, just params)
export const ResendInvitationParamsSchema = z.object({
  invitationId: z.string().uuid(),
});

// Revoke Invitation (no body, just params)
export const RevokeInvitationParamsSchema = z.object({
  invitationId: z.string().uuid(),
});
```

---

## Example Data

### Sample Invitation (Pending)

```typescript
const pendingInvitation: ProjectInvitation = {
  id: "inv_abc123",
  token: "a7f3c9d2e8b1f4a6c3e7d9b2f5a8c1e4d7b0f3a6c9e2d5b8f1a4c7e0d3b6f9a2",
  status: "pending",
  createdAt: new Date("2025-11-10T10:00:00Z"),
  updatedAt: new Date("2025-11-10T10:00:00Z"),
  expiresAt: new Date("2025-11-17T10:00:00Z"), // 7 days later

  email: "david@acmecorp.com",
  personalMessage: "Hi David! Let's collaborate on this video project.",
  role: "client",

  projectId: "proj_xyz123",
  invitedBy: "user_sarah456",

  resentCount: 0,
};
```

### Sample Invitation (Accepted)

```typescript
const acceptedInvitation: ProjectInvitation = {
  id: "inv_def456",
  token: "b8g4d0e3f9c2a5d8b1e4f7c0a3d6b9e2f5a8c1d4e7b0f3a6c9d2e5b8f1a4c7",
  status: "accepted",
  createdAt: new Date("2025-11-12T14:30:00Z"),
  updatedAt: new Date("2025-11-13T09:15:00Z"),
  expiresAt: new Date("2025-11-19T14:30:00Z"),

  email: "michael@acmecorp.com",
  personalMessage: "Welcome to the team, Michael!",
  role: "client",

  projectId: "proj_xyz123",
  invitedBy: "user_sarah456",

  acceptedAt: new Date("2025-11-13T09:15:00Z"),
  acceptedBy: "user_michael789",
  resentCount: 0,
};
```

### Sample Team Member (Active)

```typescript
const activeTeamMember: ProjectTeamMember = {
  id: "team_abc123",
  createdAt: new Date("2025-11-03T08:00:00Z"),
  updatedAt: new Date("2025-11-03T08:00:00Z"),

  userId: "user_michael789",
  projectId: "proj_xyz123",
  role: "client",
  isPrimaryContact: false,

  addedAt: new Date("2025-11-03T08:00:00Z"),
  addedBy: "system", // Added via invitation acceptance
  invitationId: "inv_def456",
};
```

### Sample Team Member (Primary Contact)

```typescript
const primaryContact: ProjectTeamMember = {
  id: "team_def456",
  createdAt: new Date("2025-11-01T10:00:00Z"),
  updatedAt: new Date("2025-11-01T10:00:00Z"),

  userId: "user_sarah456",
  projectId: "proj_xyz123",
  role: "client",
  isPrimaryContact: true, // ← Primary contact flag

  addedAt: new Date("2025-11-01T10:00:00Z"),
  addedBy: "user_admin123", // Added by Motionify admin
};
```

### Sample Team Member (Removed - Soft Deleted)

```typescript
const removedTeamMember: ProjectTeamMember = {
  id: "team_ghi789",
  createdAt: new Date("2025-11-05T12:00:00Z"),
  updatedAt: new Date("2025-11-15T16:30:00Z"),

  userId: "user_emma012",
  projectId: "proj_xyz123",
  role: "client",
  isPrimaryContact: false,

  addedAt: new Date("2025-11-05T12:00:00Z"),
  addedBy: "system",
  invitationId: "inv_ghi789",

  removedAt: new Date("2025-11-15T16:30:00Z"), // ← Soft delete timestamp
  removedBy: "user_sarah456",                   // ← Who removed them
};
```

### Sample Team Member with User (Extended View)

```typescript
const teamMemberWithUser: TeamMemberWithUser = {
  // Team Member fields
  id: "team_abc123",
  createdAt: new Date("2025-11-03T08:00:00Z"),
  updatedAt: new Date("2025-11-03T08:00:00Z"),
  userId: "user_michael789",
  projectId: "proj_xyz123",
  role: "client",
  isPrimaryContact: false,
  addedAt: new Date("2025-11-03T08:00:00Z"),
  addedBy: "system",
  invitationId: "inv_def456",

  // Populated User data
  user: {
    id: "user_michael789",
    email: "michael@acmecorp.com",
    name: "Michael Chen",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    createdAt: new Date("2025-11-03T08:00:00Z"),
  },

  // Computed fields for UI
  isRemoved: false,
  canBeRemoved: true, // Not self, not primary, not last PM
};
```

### Sample List Team Members Response

```typescript
const listTeamMembersResponse: ListTeamMembersResponse = {
  members: [
    {
      // Sarah Johnson - Primary Contact
      id: "team_def456",
      userId: "user_sarah456",
      projectId: "proj_xyz123",
      role: "client",
      isPrimaryContact: true,
      addedAt: new Date("2025-11-01T10:00:00Z"),
      addedBy: "user_admin123",
      createdAt: new Date("2025-11-01T10:00:00Z"),
      updatedAt: new Date("2025-11-01T10:00:00Z"),
      user: {
        id: "user_sarah456",
        email: "sarah@acmecorp.com",
        name: "Sarah Johnson",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        createdAt: new Date("2025-10-15T09:00:00Z"),
      },
      isRemoved: false,
      canBeRemoved: false, // Cannot remove primary contact
    },
    {
      // Michael Chen - Client Team
      id: "team_abc123",
      userId: "user_michael789",
      projectId: "proj_xyz123",
      role: "client",
      isPrimaryContact: false,
      addedAt: new Date("2025-11-03T08:00:00Z"),
      addedBy: "system",
      invitationId: "inv_def456",
      createdAt: new Date("2025-11-03T08:00:00Z"),
      updatedAt: new Date("2025-11-03T08:00:00Z"),
      user: {
        id: "user_michael789",
        email: "michael@acmecorp.com",
        name: "Michael Chen",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
        createdAt: new Date("2025-11-03T08:00:00Z"),
      },
      isRemoved: false,
      canBeRemoved: true, // Can be removed
    },
    {
      // Alex Kim - Project Manager
      id: "team_jkl345",
      userId: "user_alex012",
      projectId: "proj_xyz123",
      role: "project_manager",
      isPrimaryContact: false,
      addedAt: new Date("2025-10-28T10:00:00Z"),
      addedBy: "user_admin123",
      createdAt: new Date("2025-10-28T10:00:00Z"),
      updatedAt: new Date("2025-10-28T10:00:00Z"),
      user: {
        id: "user_alex012",
        email: "alex@motionify.studio",
        name: "Alex Kim",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        createdAt: new Date("2025-01-15T09:00:00Z"),
      },
      isRemoved: false,
      canBeRemoved: false, // Cannot remove last PM (assuming only PM)
    },
  ],

  pendingInvitations: [
    {
      id: "inv_abc123",
      token: "a7f3c9d2e8b1f4a6c3e7d9b2f5a8c1e4d7b0f3a6c9e2d5b8f1a4c7e0d3b6f9a2",
      status: "pending",
      createdAt: new Date("2025-11-10T10:00:00Z"),
      updatedAt: new Date("2025-11-10T10:00:00Z"),
      expiresAt: new Date("2025-11-17T10:00:00Z"),
      email: "david@acmecorp.com",
      personalMessage: "Hi David! Let's collaborate on this video project.",
      role: "client",
      projectId: "proj_xyz123",
      invitedBy: "user_sarah456",
      resentCount: 0,

      inviter: {
        id: "user_sarah456",
        email: "sarah@acmecorp.com",
        name: "Sarah Johnson",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        createdAt: new Date("2025-10-15T09:00:00Z"),
      },
      project: {
        id: "proj_xyz123",
        name: "Brand Video Campaign",
        description: "Video production for Acme Corporation",
        status: "in_progress",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      },
      isExpired: false,
      daysUntilExpiry: 4,
    },
  ],

  totalMembers: 3,
  totalInvitations: 1,
};
```

---

## Type Utilities

### Helper Functions

```typescript
// Check if invitation is expired
export function isInvitationExpired(invitation: ProjectInvitation): boolean {
  return new Date() > invitation.expiresAt;
}

// Get days until invitation expires
export function getDaysUntilExpiry(invitation: ProjectInvitation): number {
  const now = new Date();
  const diffMs = invitation.expiresAt.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Check if team member can be removed
export function canRemoveTeamMember(
  member: ProjectTeamMember,
  currentUserId: string,
  allMembers: ProjectTeamMember[]
): boolean {
  // Cannot remove self
  if (member.userId === currentUserId) return false;

  // Cannot remove primary contact
  if (member.isPrimaryContact) return false;

  // Cannot remove last project manager
  if (member.role === 'project_manager') {
    const pmCount = allMembers.filter(m =>
      m.role === 'project_manager' &&
      !m.removedAt
    ).length;
    if (pmCount <= 1) return false;
  }

  return true;
}

// Generate invitation acceptance URL
export function getInvitationAcceptanceUrl(token: string, baseUrl: string = 'https://motionify.studio'): string {
  return `${baseUrl}/invitations/accept?token=${token}`;
}

// Format team member display name
export function formatTeamMemberName(member: TeamMemberWithUser): string {
  if (member.isRemoved) {
    return `${member.user.name} (removed)`;
  }
  return member.user.name;
}
```
