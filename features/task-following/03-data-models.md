# Data Models: Task Following System

This document defines all TypeScript interfaces and types for the feature.

## Table of Contents

1. [TaskFollower Model](#taskfollower-model)
2. [Supporting Types](#supporting-types)
3. [API Response Types](#api-response-types)
4. [Validation Rules](#validation-rules)
5. [Example Data](#example-data)

---

## TaskFollower Model

The primary model representing the follow relationship between a user and a task.

```typescript
export interface TaskFollower {
  // Core Identification
  id: string;                    // UUID
  taskId: string;                // UUID - foreign key to tasks table
  userId: string;                // UUID - foreign key to users table
  createdAt: Date;
  
  // Metadata
  followedVia: FollowSource;     // How the follow was created
  notificationsEnabled: boolean; // Can user mute notifications
}
```

### FollowSource Type

**Note:** This enum should match `FollowerSource` in core-task-management. Use the one from core-task-management as the source of truth.

```typescript
export type FollowSource =
  | 'assignment'      // Auto-followed when assigned to task
  | 'creator'         // Auto-followed when creating task
  | 'comment'         // Auto-followed when commenting on task
  | 'manual';         // User clicked "Follow" button
```

---

## Supporting Types

### FollowerInfo Type

Extended follower information including user details.

```typescript
export interface FollowerInfo {
  id: string;                    // User ID
  name: string;                  // Full name
  email: string;
  role: UserRole;                // project_manager, client, etc.
  avatar: string | null;         // Avatar URL
  isAssignee: boolean;           // Is this user also assigned?
  followedAt: Date;
  followSource: FollowSource;
}
```

### TaskWithFollowers Type

Task data enriched with follower information.

```typescript
export interface TaskWithFollowers {
  id: string;
  title: string;
  status: TaskStatus;
  // ... other task fields
  
  followerCount: number;
  followers: FollowerInfo[];
  isFollowedByCurrentUser: boolean;
}
```

---

## API Response Types

### Follow Task Response

```typescript
export interface FollowTaskResponse {
  success: true;
  data: {
    follower: TaskFollower;
    followerCount: number;
  };
  message: string; // "You are now following this task"
}
```

### Unfollow Task Response

```typescript
export interface UnfollowTaskResponse {
  success: true;
  data: {
    followerCount: number;
  };
  message: string; // "You have unfollowed this task"
}
```

### Get Followers Response

```typescript
export interface GetFollowersResponse {
  success: true;
  data: {
    followers: FollowerInfo[];
    count: number;
  };
}
```

---

## Validation Rules

### TaskFollower Validation

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| taskId | Yes | UUID | Must exist in tasks table |
| userId | Yes | UUID | Must exist in users table |
| followedVia | Yes | FollowSource enum | Default: 'manual' |
| notificationsEnabled | Yes | Boolean | Default: true |

### Composite Unique Constraint

```typescript
// Prevent duplicate follows
UNIQUE(userId, taskId)
```

### Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const TaskFollowerSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  followedVia: z.enum(['manual', 'auto_assigned', 'auto_created']),
  notificationsEnabled: z.boolean().default(true),
  createdAt: z.date(),
});

export const FollowTaskRequestSchema = z.object({
  taskId: z.string().uuid(),
  // userId comes from JWT, not request body
});
```

---

## Example Data

### Sample TaskFollower Instance

```typescript
const sampleFollower: TaskFollower = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  taskId: "660e8400-e29b-41d4-a716-446655440001",
  userId: "770e8400-e29b-41d4-a716-446655440002",
  followedVia: "manual",
  notificationsEnabled: true,
  createdAt: new Date("2025-11-13T10:30:00Z"),
};
```

### Sample FollowerInfo Array

```typescript
const sampleFollowers: FollowerInfo[] = [
  {
    id: "770e8400-e29b-41d4-a716-446655440002",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    role: "project_manager",
    avatar: "https://example.com/avatars/sarah.jpg",
    isAssignee: true,
    followedAt: new Date("2025-11-12T09:00:00Z"),
    followSource: "auto_assigned",
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440003",
    name: "John Doe",
    email: "john@client.com",
    role: "client",
    avatar: null,
    isAssignee: false,
    followedAt: new Date("2025-11-13T10:30:00Z"),
    followSource: "manual",
  },
];
```

### Sample TaskWithFollowers

```typescript
const sampleTask: TaskWithFollowers = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  title: "Design homepage mockups",
  status: "in_progress",
  followerCount: 5,
  followers: sampleFollowers,
  isFollowedByCurrentUser: true,
};
```

---

## Type Guards & Utilities

```typescript
// Check if user is following a task
export function isFollowing(
  taskId: string,
  userId: string,
  followers: TaskFollower[]
): boolean {
  return followers.some(
    f => f.taskId === taskId && f.userId === userId
  );
}

// Get follower count for a task
export function getFollowerCount(followers: TaskFollower[], taskId: string): number {
  return followers.filter(f => f.taskId === taskId).length;
}

// Check if follow was automatic
export function isAutoFollow(follower: TaskFollower): boolean {
  return follower.followedVia === 'auto_assigned' || 
         follower.followedVia === 'auto_created';
}
```
