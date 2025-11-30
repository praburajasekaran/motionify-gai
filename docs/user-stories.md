# User Stories - Motionify PM Portal

**Last Updated**: 2025-11-06
**Status**: Active Development
**Target Timeline**: 11 weeks
**Estimated Cost**: $33,000-$34,000

## Table of Contents
1. [User Roles](#user-roles)
2. [Epic 1: Authentication & User Management](#epic-1-authentication--user-management)
3. [Epic 2: Project Management](#epic-2-project-management)
4. [Epic 3: Task Management](#epic-3-task-management)
5. [Epic 4: File Management](#epic-4-file-management)
6. [Epic 5: Team Collaboration](#epic-5-team-collaboration)
7. [Epic 6: Deliverables & Approvals](#epic-6-deliverables--approvals)
8. [Epic 7: Notifications](#epic-7-notifications)
9. [Epic 8: System Administration](#epic-8-system-administration)
10. [Non-Functional Requirements](#non-functional-requirements)
11. [Data Retention Policy](#data-retention-policy)

---

## User Roles

### Technical Role Mapping

| User Story Role | Technical Role | Database Value | Description |
|----------------|----------------|----------------|-------------|
| **Motionify Admin** | Super Admin | `super_admin` | Full system access, can manage all projects and users |
| **Motionify Team Member** | Project Manager | `project_manager` | Can manage assigned projects, create tasks, upload files |
| **Client Project Lead** | Client (Primary Contact) | `client` + `is_primary_contact: true` | Client representative with elevated permissions |
| **Client Team Member** | Client | `client` | Standard client access to assigned projects |

### Role Permissions Matrix

| Permission | Motionify Admin | Motionify Team | Client Lead | Client Team |
|-----------|----------------|----------------|-------------|-------------|
| Create projects | ✅ | ❌ | ❌ | ❌ |
| Delete projects | ✅ | ❌ | ❌ | ❌ |
| Archive projects | ✅ | ❌ | ❌ | ❌ |
| Assign Motionify team | ✅ | ❌ | ❌ | ❌ |
| Invite client team | ✅ | ❌ | ✅ | ❌ |
| Create/edit tasks | ✅ | ✅ | ❌ | ❌ |
| Assign tasks | ✅ | ✅ | ✅ | ✅ |
| Follow tasks | ✅ | ✅ | ✅ | ✅ |
| Accept project terms | N/A | N/A | ✅ | ❌ |
| Approve deliverables | N/A | N/A | ✅ | ❌ |
| Request revisions | N/A | N/A | ✅ | ❌ |
| Upload/download files | ✅ | ✅ | ✅ | ✅ |
| Comment on tasks/files | ✅ | ✅ | ✅ | ✅ |

---

## Epic 1: Authentication & User Management

### US-001: Magic Link Login
**As a** portal user
**I want to** receive a magic link via email to log in without a password
**So that** I can securely access the portal without remembering passwords

**Acceptance Criteria:**
- [ ] User enters email address on login page
- [ ] System sends magic link to email within 30 seconds
- [ ] Magic link is valid for 15 minutes
- [ ] Clicking link logs user in and redirects to dashboard
- [ ] Magic link can only be used once
- [ ] Rate limit: 3 requests per hour per email address
- [ ] Clear error messages for invalid/expired links
- [ ] HTTP-only cookie set for session management

**API Endpoints:**
- `POST /api/auth/request-magic-link`
- `GET /api/auth/verify-magic-link`

**Database Tables:**
- `users` - stores user information
- `magic_link_tokens` - stores temporary auth tokens

**Frontend Components:**
- ✅ `/src/lib/portal/components/LoginScreen.tsx`

**Status:** ✅ **Implemented in Frontend** | 📋 **Backend Planned** (Week 1-2)

**Priority:** **MUST HAVE** (MVP)

---

### US-002: User Session Management
**As a** logged-in user
**I want to** stay logged in across browser sessions
**So that** I don't have to re-authenticate every time I visit the portal

**Acceptance Criteria:**
- [ ] JWT token issued on successful authentication
- [ ] Token stored in HTTP-only cookie
- [ ] Token valid for 30 days
- [ ] Automatic token refresh when user is active
- [ ] Logout clears session and invalidates token
- [ ] Session persists across browser tabs

**API Endpoints:**
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`

**Database Tables:**
- `sessions` - track active sessions

**Frontend Components:**
- ✅ `/src/lib/portal/AppRoot.tsx` - session management via localStorage (temporary)

**Status:** 🔄 **Partially Implemented** | 📋 **Backend Planned** (Week 2)

**Priority:** **MUST HAVE** (MVP)

---

### US-003: User Profile Management
**As a** portal user
**I want to** view and update my profile information
**So that** my details are current and other team members can contact me

**Acceptance Criteria:**
- [ ] View name, email, role, assigned projects
- [ ] Update name and notification preferences
- [ ] Cannot change email (requires admin)
- [ ] Cannot change role (requires admin)
- [ ] Profile photo upload (optional)
- [ ] View activity history

**API Endpoints:**
- `GET /api/users/me`
- `PATCH /api/users/me`
- `POST /api/users/me/avatar`

**Database Tables:**
- `users`

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 3)

**Priority:** **SHOULD HAVE** (Post-MVP)

---

## Epic 2: Project Management

### US-004: Create New Project (Admin)
**As a** Motionify admin
**I want to** create new projects with deliverables and revision counts
**So that** I can set up client work with clear scope and expectations

**Acceptance Criteria:**
- [ ] Enter project name, description, client name
- [ ] Add 1 or more deliverables with descriptions
- [ ] Set total revision count per project (default: 3)
- [ ] Assign client primary contact
- [ ] Assign Motionify project manager
- [ ] Set project start/end dates
- [ ] Define project scope (inclusions/exclusions)
- [ ] Validation: prevent duplicate project names
- [ ] Email notification sent to assigned team members
- [ ] Project status defaults to "In Progress"

**API Endpoints:**
- `POST /api/projects`

**Database Tables:**
- `projects` - main project information
- `project_deliverables` - deliverables for each project
- `project_team` - team member assignments

**Frontend Components:**
- ✅ `/src/lib/portal/components/ProjectManagerDashboard.tsx` - create project modal (partial)

**Status:** 🔄 **Partially Implemented** | Needs deliverables tracking

**Priority:** **MUST HAVE** (MVP)

---

### US-005: View Project Overview
**As a** project team member
**I want to** view comprehensive project details on the overview page
**So that** I understand the project scope, progress, and current status

**Acceptance Criteria:**
- [ ] Display project name, client, status, dates
- [ ] Show project scope (inclusions/exclusions)
- [ ] List all deliverables with status
- [ ] Show revision count (used/total)
- [ ] Display project team (Motionify + client)
- [ ] Show recent activity feed
- [ ] Display overall progress percentage
- [ ] Client primary contact highlighted
- [ ] Project terms acceptance status (for client lead)

**API Endpoints:**
- `GET /api/projects/:id`
- `GET /api/projects/:id/activities`

**Database Tables:**
- `projects`
- `project_deliverables`
- `activities`

**Frontend Components:**
- ✅ `/src/lib/portal/components/ProjectOverview.tsx`

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

### US-006: Archive Project (Admin)
**As a** Motionify admin
**I want to** archive completed projects
**So that** they're hidden from active lists but data is preserved

**Acceptance Criteria:**
- [ ] Only admins can archive projects
- [ ] Project status must be "Completed" before archiving
- [ ] Confirmation dialog with warning
- [ ] Archived projects hidden from main project list
- [ ] Archived projects accessible via "View Archived" filter
- [ ] All project data remains accessible (read-only)
- [ ] Activity logged: "Project archived by [user]"

**API Endpoints:**
- `PATCH /api/projects/:id/archive`

**Database Tables:**
- `projects` - update `status` field to 'archived'

**Frontend Components:**
- ✅ `/src/lib/portal/components/ProjectManagerDashboard.tsx` - archive action (partial)

**Status:** 🔄 **Partially Implemented** | Needs backend

**Priority:** **SHOULD HAVE** (MVP)

---

### US-007: Delete Project (Admin)
**As a** Motionify admin
**I want to** permanently delete projects
**So that** I can remove test/cancelled projects from the system

**Acceptance Criteria:**
- [ ] Only super admins can delete projects
- [ ] Project must be archived first (cannot delete active projects)
- [ ] Confirmation dialog with "type project name to confirm"
- [ ] Permanently deletes project and all associated data
- [ ] Deletes: tasks, files, comments, activities, team assignments
- [ ] Cannot be undone
- [ ] Email notification to all team members
- [ ] Logged in system audit trail

**API Endpoints:**
- `DELETE /api/projects/:id`

**Database Tables:**
- Cascade delete from `projects` to all related tables

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 4)

**Priority:** **SHOULD HAVE** (Post-MVP)

---

### US-008: Assign/Unassign Motionify Team (Admin)
**As a** Motionify admin
**I want to** assign and unassign Motionify team members to projects
**So that** I can manage workload and project staffing

**Acceptance Criteria:**
- [ ] View list of all Motionify team members
- [ ] Add team members to project
- [ ] Remove team members from project
- [ ] Must keep at least 1 project manager per project
- [ ] Email notification sent when assigned/removed
- [ ] Removed members lose access to project
- [ ] Removed members' historical contributions remain visible
- [ ] Activity logged for all team changes

**API Endpoints:**
- `POST /api/projects/:id/team/motionify`
- `DELETE /api/projects/:id/team/motionify/:userId`

**Database Tables:**
- `project_team`

**Frontend Components:**
- ✅ `/src/lib/portal/components/ManageTeamModal.tsx`

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

## Epic 3: Task Management

### US-009: Create Task
**As a** Motionify team member
**I want to** create new tasks linked to project deliverables
**So that** I can organize project work and track progress

**Acceptance Criteria:**
- [ ] Enter task title (required) and description (optional)
- [ ] Link task to a specific deliverable
- [ ] Set visibility: "Visible to Client" or "Internal Only"
- [ ] Set optional deadline
- [ ] Assign to one team member (optional)
- [ ] Task status defaults to "Pending"
- [ ] Task appears in project task list immediately
- [ ] Activity logged: "Task created by [user]"
- [ ] Email notification if assignee specified

**API Endpoints:**
- `POST /api/projects/:id/tasks`

**Database Tables:**
- `tasks`

**Frontend Components:**
- ✅ `/src/lib/portal/components/TaskList.tsx` - create task functionality

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

### US-010: Assign/Reassign Task
**As a** team member
**I want to** assign tasks to one or more team members (Motionify or client)
**So that** responsibilities are clear and team members are notified

**Acceptance Criteria:**
- [ ] Assign task to any project team member
- [ ] Support multiple assignees per task
- [ ] Unassigned tasks visible in "Unassigned Tasks" filter
- [ ] Email notification sent to new assignees
- [ ] Activity logged: "Task assigned to [user] by [user]"
- [ ] Assignees can remove themselves
- [ ] Task appears in assignee's "My Tasks" view

**API Endpoints:**
- `PATCH /api/tasks/:id/assign`
- `DELETE /api/tasks/:id/assign/:userId`

**Database Tables:**
- `task_assignments` - support multiple assignees

**Frontend Components:**
- ✅ `/src/lib/portal/components/TaskItem.tsx` - shows single assignee (needs update for multiple)

**Status:** 🔄 **Partially Implemented** | Currently single assignee only, needs multi-assignee support

**Priority:** **MUST HAVE** (MVP)

---

### US-011: Follow/Unfollow Task
**As a** team member
**I want to** follow tasks that I'm not assigned to
**So that** I receive notifications about updates even if I'm not directly responsible

**Acceptance Criteria:**
- [ ] "Follow" button visible on all tasks
- [ ] Can follow any task in projects I'm a member of
- [ ] Followers receive notifications for status changes, comments, file uploads
- [ ] Followers count displayed on task
- [ ] View list of followers (hovering/clicking count)
- [ ] Can unfollow at any time
- [ ] "My Followed Tasks" filter option
- [ ] Assignees automatically follow their tasks

**API Endpoints:**
- `POST /api/tasks/:id/follow`
- `DELETE /api/tasks/:id/follow`
- `GET /api/tasks/:id/followers`

**Database Tables:**
- `task_followers` - separate from assignments

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 5) | **CRITICAL FOR MVP**

**Priority:** **MUST HAVE** (MVP)

---

### US-012: Update Task Status
**As a** team member
**I want to** update task status following valid state transitions
**So that** project progress is tracked accurately

**Acceptance Criteria:**
- [ ] Valid transitions enforced (see state machine)
- [ ] Pending → In Progress (any team member)
- [ ] In Progress → Awaiting Approval (Motionify team only)
- [ ] Awaiting Approval → Completed (Client Primary Contact only)
- [ ] Awaiting Approval → Revision Requested (Client Primary Contact only)
- [ ] Revision Requested → In Progress (Motionify team only)
- [ ] Completed → In Progress (reopen, admin only)
- [ ] Invalid transitions show error message
- [ ] Activity logged for every status change
- [ ] Email notification to assignees and followers

**API Endpoints:**
- `PATCH /api/tasks/:id/status`

**Database Tables:**
- `tasks` - update `status` field
- `activities` - log status change

**Frontend Components:**
- ✅ `/src/lib/portal/components/TaskItem.tsx`
- ✅ `/src/lib/portal/utils/taskStateTransitions.ts` - state machine validation

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

### US-013: Filter and View Tasks
**As a** team member
**I want to** filter tasks by various criteria
**So that** I can focus on relevant work

**Acceptance Criteria:**
- [ ] Filter by "All Tasks" | "My Tasks" | "Unassigned" | "Followed Tasks"
- [ ] Filter by deliverable
- [ ] Filter by status (Pending, In Progress, etc.)
- [ ] Filter by assignee
- [ ] Search tasks by title/description
- [ ] Sort by: deadline, created date, status, priority
- [ ] Show task count per filter
- [ ] Filters persist across page reloads
- [ ] Clear all filters option

**API Endpoints:**
- `GET /api/projects/:id/tasks?filter=...&sort=...`

**Database Tables:**
- `tasks`
- `task_assignments`
- `task_followers`

**Frontend Components:**
- ✅ `/src/lib/portal/components/TaskList.tsx` - basic filtering implemented

**Status:** 🔄 **Partially Implemented** | Has "My Tasks" filter, needs more options

**Priority:** **SHOULD HAVE** (MVP)

---

### US-014: Add Delivery Notes to Task
**As a** Motionify team member
**I want to** add delivery notes when marking a task as "Awaiting Approval"
**So that** the client understands what to review and provide context

**Acceptance Criteria:**
- [ ] Delivery notes field appears when changing status to "Awaiting Approval"
- [ ] Notes are optional but encouraged (warning if empty)
- [ ] Supports markdown formatting
- [ ] Notes visible to client when reviewing task
- [ ] Notes included in email notification
- [ ] Can edit notes after submission (within 1 hour)

**API Endpoints:**
- `PATCH /api/tasks/:id/delivery-notes`

**Database Tables:**
- `tasks` - add `delivery_notes` field

**Frontend Components:**
- ✅ `/src/lib/portal/components/TaskItem.tsx` - delivery notes field exists

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **SHOULD HAVE** (MVP)

---

## Epic 4: File Management

### US-015: Upload Files
**As a** team member
**I want to** upload files and link them to deliverables
**So that** project assets are organized and accessible to the team

**Acceptance Criteria:**
- [ ] Drag-and-drop or click to upload
- [ ] Support multiple files in one upload
- [ ] File size limit: 500MB per file
- [ ] Supported formats: video (mp4, mov, avi), images (jpg, png, gif, svg), documents (pdf, docx, xlsx), archives (zip, rar)
- [ ] Link file to specific deliverable (required)
- [ ] Add optional description
- [ ] Upload progress indicator
- [ ] Files stored in Cloudflare R2
- [ ] Activity logged: "File uploaded by [user]"
- [ ] Email notification to project team

**API Endpoints:**
- `POST /api/files/upload-url` - get presigned URL for direct R2 upload
- `POST /api/files` - register uploaded file in database

**Database Tables:**
- `files`

**External Services:**
- Cloudflare R2 bucket

**Frontend Components:**
- ✅ `/src/lib/portal/components/Files.tsx` - upload UI (mock)

**Status:** 🔄 **Partially Implemented** | Needs R2 integration

**Priority:** **MUST HAVE** (MVP)

---

### US-016: Download Files
**As a** team member
**I want to** download uploaded files
**So that** I can review, edit, or use project assets

**Acceptance Criteria:**
- [ ] Click filename or download icon to download
- [ ] Presigned download URL generated (valid for 1 hour)
- [ ] Large files (>100MB) show download progress
- [ ] Original filename preserved
- [ ] Activity logged: "File downloaded by [user]"
- [ ] Download counts tracked (optional)

**API Endpoints:**
- `GET /api/files/:id/download-url` - get presigned R2 URL

**Database Tables:**
- `files`
- `file_downloads` - optional tracking

**Frontend Components:**
- ✅ `/src/lib/portal/components/FileItem.tsx` - download button exists (mock)

**Status:** 🔄 **Partially Implemented** | Needs R2 integration

**Priority:** **MUST HAVE** (MVP)

---

### US-017: Organize Files by Deliverable
**As a** team member
**I want to** view files grouped by deliverable
**So that** I can quickly find assets related to specific project outputs

**Acceptance Criteria:**
- [ ] Files page shows deliverable tabs/sections
- [ ] Each deliverable section shows its files
- [ ] File count per deliverable displayed
- [ ] "All Files" view shows everything
- [ ] Drag-and-drop to move files between deliverables
- [ ] Search across all files
- [ ] Sort by: name, upload date, size, type

**API Endpoints:**
- `GET /api/projects/:id/files?deliverableId=...`
- `PATCH /api/files/:id` - update deliverable assignment

**Database Tables:**
- `files`
- `project_deliverables`

**Frontend Components:**
- ✅ `/src/lib/portal/components/Files.tsx` - deliverable grouping implemented

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **SHOULD HAVE** (MVP)

---

### US-018: Rename and Update File Details
**As a** team member
**I want to** rename files and update descriptions
**So that** files are clearly labeled and understandable

**Acceptance Criteria:**
- [ ] Click filename to rename (in-line editing)
- [ ] Edit description in file details panel
- [ ] Changes saved immediately
- [ ] Activity logged: "File renamed by [user]"
- [ ] Cannot change file extension
- [ ] Cannot rename to existing filename in same deliverable

**API Endpoints:**
- `PATCH /api/files/:id`

**Database Tables:**
- `files`

**Frontend Components:**
- ✅ `/src/lib/portal/components/FileItem.tsx` - rename functionality exists

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **COULD HAVE** (Post-MVP)

---

### US-019: Comment on Files
**As a** team member
**I want to** leave comments on uploaded files
**So that** I can provide feedback or ask questions about specific assets

**Acceptance Criteria:**
- [ ] Comment box under each file
- [ ] Supports markdown formatting
- [ ] @ mentions notify specific team members
- [ ] Comments show user name, avatar, timestamp
- [ ] Can edit own comments (within 1 hour)
- [ ] Can delete own comments (any time)
- [ ] Activity logged: "Comment added on [file]"
- [ ] Email notification to file uploader and @mentioned users

**API Endpoints:**
- `POST /api/files/:id/comments`
- `PATCH /api/files/:id/comments/:commentId`
- `DELETE /api/files/:id/comments/:commentId`

**Database Tables:**
- `file_comments`

**Frontend Components:**
- ✅ `/src/lib/portal/components/FileItem.tsx` - comments section implemented

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **SHOULD HAVE** (MVP)

---

## Epic 5: Team Collaboration

### US-020: Add Comments to Tasks
**As a** team member
**I want to** leave comments on tasks
**So that** I can discuss progress, ask questions, and collaborate

**Acceptance Criteria:**
- [ ] Comment box visible on expanded task view
- [ ] Supports markdown formatting
- [ ] @ mentions notify specific team members
- [ ] Comments show user name, avatar, timestamp
- [ ] Can edit own comments (within 1 hour)
- [ ] Can delete own comments (any time)
- [ ] Comment count badge on task
- [ ] Activity logged: "Comment added on [task]"
- [ ] Email notification to assignees, followers, and @mentioned users

**API Endpoints:**
- `POST /api/tasks/:id/comments`
- `PATCH /api/tasks/:id/comments/:commentId`
- `DELETE /api/tasks/:id/comments/:commentId`

**Database Tables:**
- `task_comments`

**Frontend Components:**
- ✅ `/src/lib/portal/components/TaskItem.tsx` - comments functionality implemented

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

### US-021: Invite Client Team Members
**As a** client primary contact
**I want to** invite my team members to the project
**So that** they can collaborate on project deliverables

**Acceptance Criteria:**
- [ ] "Invite Team Member" button visible to client primary contact
- [ ] Enter invitee email address and name
- [ ] System generates unique invite link valid for 7 days
- [ ] Invitation email sent with project details and invite link
- [ ] Invitee clicks link, creates account (magic link on first login)
- [ ] Invitee automatically added to project with "client" role
- [ ] Invitations list shows pending/accepted status
- [ ] Can resend invitation email
- [ ] Can revoke unused invitations

**API Endpoints:**
- `POST /api/projects/:id/invitations`
- `GET /api/projects/:id/invitations`
- `POST /api/invitations/:token/accept`
- `DELETE /api/invitations/:id`

**Database Tables:**
- `project_invitations`

**Frontend Components:**
- ✅ `/src/lib/portal/components/InviteModal.tsx` - UI exists but simplified

**Status:** 🔄 **Partially Implemented** | Currently just adds users directly, needs invitation system

**Priority:** **MUST HAVE** (MVP)

---

### US-022: Remove Team Members
**As a** project administrator (Motionify admin or client primary contact)
**I want to** remove team members from projects
**So that** access is revoked when people leave the project

**Acceptance Criteria:**
- [ ] Motionify admin can remove any team member
- [ ] Client primary contact can remove client team members only
- [ ] Cannot remove yourself
- [ ] Cannot remove last project manager (Motionify projects)
- [ ] Cannot remove client primary contact (must transfer first)
- [ ] Confirmation dialog before removal
- [ ] Removed member loses project access immediately
- [ ] All historical data (tasks, comments, files) remains visible with attribution
- [ ] Activity logged: "[User] removed from project by [admin]"
- [ ] Email notification sent to removed member

**API Endpoints:**
- `DELETE /api/projects/:id/team/:userId`

**Database Tables:**
- `project_team` - mark as removed but keep record
- Data retention: do NOT delete from `tasks`, `comments`, `files`, `activities`

**Frontend Components:**
- ✅ `/src/lib/portal/components/TeamManagement.tsx` - UI for team management exists

**Status:** 🔄 **Partially Implemented** | Needs backend enforcement of data retention

**Priority:** **MUST HAVE** (MVP)

---

## Epic 6: Deliverables & Approvals

### US-023: Define Project Deliverables
**As a** Motionify admin
**I want to** define project deliverables when creating a project
**So that** scope is clear and tasks/files can be organized by deliverable

**Acceptance Criteria:**
- [ ] Add multiple deliverables during project creation
- [ ] Each deliverable has: name (required), description (optional)
- [ ] Can add/edit/remove deliverables after project creation
- [ ] Tasks must be linked to a deliverable
- [ ] Files must be linked to a deliverable
- [ ] Deliverable status auto-calculated based on linked tasks
- [ ] Cannot delete deliverable if it has tasks/files (must reassign first)
- [ ] Activity logged: "Deliverable added/updated/removed"

**API Endpoints:**
- `POST /api/projects/:id/deliverables`
- `GET /api/projects/:id/deliverables`
- `PATCH /api/deliverables/:id`
- `DELETE /api/deliverables/:id`

**Database Tables:**
- `project_deliverables`

**Frontend Components:**
- 📋 Not yet implemented (referenced in task/file components)

**Status:** 📋 **Planned** (Week 3) | **CRITICAL FOR MVP**

**Priority:** **MUST HAVE** (MVP)

---

### US-024: Track Revision Counts
**As a** Motionify admin
**I want to** set revision limits when creating projects
**So that** scope creep is managed and additional work is tracked

**Acceptance Criteria:**
- [ ] Set total revision count during project creation (default: 3)
- [ ] Used revision count increments when client requests revision
- [ ] Project overview shows "X of Y revisions used"
- [ ] Warning shown when approaching revision limit (e.g., "1 revision remaining")
- [ ] Alert when revisions exhausted: "All revisions used. Additional requests will require approval."
- [ ] Admin can add additional revisions mid-project
- [ ] Activity logged for revision usage and revision additions
- [ ] Cannot go negative (must request additional revisions first)

**API Endpoints:**
- `GET /api/projects/:id/revisions`
- `POST /api/projects/:id/revisions/add` - admin adds more revisions

**Database Tables:**
- `projects` - fields: `total_revisions`, `used_revisions`
- `revision_requests` - log each revision request

**Frontend Components:**
- ✅ `/src/lib/portal/components/ProjectOverview.tsx` - displays revision count
- ✅ `/src/lib/portal/components/RevisionModal.tsx` - revision request UI

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

### US-025: Accept Project Terms (Client)
**As a** client primary contact
**I want to** review and accept project terms before work begins
**So that** expectations are clear and agreed upon

**Acceptance Criteria:**
- [ ] On first login, client primary contact sees project terms modal
- [ ] Terms include: project scope, deliverables, revision count, timeline, pricing
- [ ] Cannot access project until terms are accepted
- [ ] "Accept Terms" button with confirmation checkbox
- [ ] Option to "Request Changes to Terms" with comment box
- [ ] Terms acceptance logged with timestamp
- [ ] Email notification to Motionify team when terms accepted
- [ ] Email notification when client requests changes
- [ ] Admin can update terms; client must re-accept if changed

**API Endpoints:**
- `GET /api/projects/:id/terms`
- `POST /api/projects/:id/terms/accept`
- `POST /api/projects/:id/terms/request-revision`

**Database Tables:**
- `project_terms`
- `project_terms_acceptance`

**Frontend Components:**
- ✅ `/src/lib/portal/components/OnboardingAgreement.tsx` - basic agreement UI exists

**Status:** 🔄 **Partially Implemented** | Has basic agreement, needs full terms workflow

**Priority:** **MUST HAVE** (MVP)

---

### US-026: Request Revisions to Project Terms (Client)
**As a** client primary contact
**I want to** request changes to project terms
**So that** scope, deliverables, or timelines can be adjusted before work starts

**Acceptance Criteria:**
- [ ] "Request Changes" button visible on terms review screen
- [ ] Comment box to describe requested changes
- [ ] Request sent to Motionify admin via email
- [ ] Client primary contact sees "Terms revision requested" status
- [ ] Admin reviews request and either: updates terms, or responds with message
- [ ] If terms updated, client must re-review and accept
- [ ] All term revision history logged and visible
- [ ] Project work can only start after terms accepted

**API Endpoints:**
- `POST /api/projects/:id/terms/request-revision`
- `PATCH /api/projects/:id/terms` - admin updates terms

**Database Tables:**
- `project_terms` - add `version` field for revision tracking
- `project_terms_revisions` - log all requested changes

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 4) | **CRITICAL FOR MVP**

**Priority:** **MUST HAVE** (MVP)

---

### US-027: Approve Deliverables (Client)
**As a** client primary contact
**I want to** approve completed deliverables
**So that** I can formally sign off on project outputs

**Acceptance Criteria:**
- [ ] When all tasks for a deliverable are "Awaiting Approval", approve button appears
- [ ] Click "Approve Deliverable" shows confirmation dialog
- [ ] Optional: add approval comments/feedback
- [ ] Approved deliverables marked with ✅ status
- [ ] Approved deliverables cannot be reopened (unless admin overrides)
- [ ] Activity logged: "Deliverable approved by [client]"
- [ ] Email notification to Motionify team
- [ ] Project progress updated (e.g., "2 of 4 deliverables approved")
- [ ] When all deliverables approved, project status can be set to "Completed"

**API Endpoints:**
- `POST /api/deliverables/:id/approve`
- `GET /api/projects/:id/deliverables/status`

**Database Tables:**
- `project_deliverables` - add `status` and `approved_at` fields
- `deliverable_approvals` - log approval details

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 5-6) | **CRITICAL FOR MVP**

**Priority:** **MUST HAVE** (MVP)

---

### US-028: Request Revisions to Deliverables (Client)
**As a** client primary contact
**I want to** request revisions on deliverables awaiting my approval
**So that** work can be refined until it meets expectations

**Acceptance Criteria:**
- [ ] "Request Revision" button visible on deliverables awaiting approval
- [ ] Comment box required: describe what needs to change
- [ ] Revision request decrements available revision count
- [ ] If no revisions remaining: show "Request Additional Revisions" flow
- [ ] Motionify team receives email notification with feedback
- [ ] Associated tasks change status to "Revision Requested"
- [ ] Activity logged: "Revision requested by [client] (X remaining)"
- [ ] Revision count updated in project overview

**API Endpoints:**
- `POST /api/deliverables/:id/request-revision`
- `POST /api/projects/:id/revisions/request-additional`

**Database Tables:**
- `projects` - increment `used_revisions`
- `revision_requests`
- `tasks` - update status to "Revision Requested"

**Frontend Components:**
- ✅ `/src/lib/portal/components/RequestRevisionModal.tsx` - UI exists

**Status:** 🔄 **Partially Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

### US-029: Request Additional Revisions (Client)
**As a** client primary contact
**I want to** request additional revisions when the project limit is reached
**So that** I can continue providing feedback with proper approval

**Acceptance Criteria:**
- [ ] When used_revisions >= total_revisions, "Request Additional Revisions" modal appears
- [ ] Cannot request deliverable revision without requesting additional revisions first
- [ ] Comment box: explain reason for additional revision request
- [ ] Request sent to Motionify admin for approval
- [ ] Client sees "Additional revisions requested - pending approval" status
- [ ] Admin reviews and either: approves (increments total_revisions), or declines with reason
- [ ] If approved, client can proceed with revision request
- [ ] All requests logged in activity feed
- [ ] Email notifications sent at each step

**API Endpoints:**
- `POST /api/projects/:id/revisions/request-additional`
- `PATCH /api/projects/:id/revisions/approve-request`
- `PATCH /api/projects/:id/revisions/decline-request`

**Database Tables:**
- `additional_revision_requests`
- `projects` - update `total_revisions` if approved

**Frontend Components:**
- ✅ `/src/lib/portal/components/RevisionModal.tsx` - handles this flow

**Status:** ✅ **Implemented** | Needs backend integration

**Priority:** **MUST HAVE** (MVP)

---

## Epic 7: Notifications

### US-030: In-App Notifications
**As a** team member
**I want to** receive real-time in-app notifications
**So that** I stay informed about project updates without checking email constantly

**Acceptance Criteria:**
- [ ] Notification bell icon in top navigation
- [ ] Unread count badge displayed
- [ ] Clicking bell shows notification dropdown
- [ ] Notifications show: icon, message, timestamp, project/task link
- [ ] Mark individual notifications as read (click to view)
- [ ] "Mark all as read" button
- [ ] Notification types: task assignment, status change, comment mention, file upload, approval request
- [ ] Notifications auto-marked as read after 7 days
- [ ] "View All Notifications" link to full history page

**API Endpoints:**
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/mark-all-read`

**Database Tables:**
- `notifications`

**Frontend Components:**
- ✅ `/src/lib/portal/components/NotificationBell.tsx` - fully implemented

**Status:** ✅ **Implemented** | Needs backend real-time updates

**Priority:** **MUST HAVE** (MVP)

---

### US-031: Email Notifications
**As a** team member
**I want to** receive email notifications for important project updates
**So that** I'm alerted even when not actively using the portal

**Acceptance Criteria:**
- [ ] Email sent for: task assignment, @mentions, approval requests, status changes, team changes
- [ ] Email includes: notification message, link to relevant item, "View in Portal" button
- [ ] Email sent via Amazon SES
- [ ] Branded email template (Motionify logo, colors)
- [ ] Plain text + HTML versions
- [ ] Unsubscribe link in footer (per-project preferences)
- [ ] Rate limiting: max 1 email per notification type per hour
- [ ] Batch notifications if multiple updates occur quickly

**API Endpoints:**
- N/A - background email service

**Database Tables:**
- `notifications` - mark `email_sent` when delivered
- `user_notification_preferences`

**External Services:**
- Amazon SES

**Frontend Components:**
- N/A

**Status:** 📋 **Planned** (Week 7-8)

**Priority:** **MUST HAVE** (MVP)

---

### US-032: Notification Preferences
**As a** team member
**I want to** customize my notification preferences
**So that** I only receive alerts for events I care about

**Acceptance Criteria:**
- [ ] Settings page with notification preferences
- [ ] Toggle in-app notifications on/off per category
- [ ] Toggle email notifications on/off per category
- [ ] Categories: Task Assignment, Comments/Mentions, Status Changes, File Uploads, Approvals, Team Changes
- [ ] Global "Mute all notifications" option per project
- [ ] "Pause notifications" for X hours/days
- [ ] Preferences saved per user per project
- [ ] Defaults: all notifications enabled

**API Endpoints:**
- `GET /api/users/me/notification-preferences`
- `PATCH /api/users/me/notification-preferences`

**Database Tables:**
- `user_notification_preferences`

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 8) | **Post-MVP**

**Priority:** **SHOULD HAVE** (Post-MVP)

---

## Epic 8: System Administration

### US-033: Add Users to Platform (Super Admin)
**As a** super admin
**I want to** add Motionify team members to the platform
**So that** they can be assigned to projects

**Acceptance Criteria:**
- [ ] Super admin can access user management page
- [ ] Add user with: name, email, role (project_manager or team_member)
- [ ] Send welcome email with magic link to set up account
- [ ] New users appear in "All Users" list
- [ ] Can edit user details (name, role)
- [ ] Can deactivate users (soft delete - preserve data)
- [ ] Deactivated users cannot log in but historical data remains
- [ ] Activity logged: "User added/updated/deactivated by [admin]"

**API Endpoints:**
- `POST /api/admin/users`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id` - soft delete

**Database Tables:**
- `users` - add `is_active` field

**Frontend Components:**
- 📋 Not yet implemented

**Status:** 📋 **Planned** (Week 3)

**Priority:** **MUST HAVE** (MVP)

---

### US-034: View Activity Logs (Admin)
**As a** Motionify admin
**I want to** view detailed activity logs for projects
**So that** I can track changes and audit user actions

**Acceptance Criteria:**
- [ ] Activity feed on project overview page
- [ ] Full activity log page with advanced filtering
- [ ] Filter by: user, action type, date range, project element (task/file/team)
- [ ] Export activity log to CSV
- [ ] Activity types logged: all CRUD operations, status changes, approvals, invitations
- [ ] Activity shows: timestamp, user, action, details, affected item link
- [ ] Activity cannot be deleted (immutable audit trail)
- [ ] Retention: keep activity logs indefinitely

**API Endpoints:**
- `GET /api/projects/:id/activities`
- `GET /api/activities/export`

**Database Tables:**
- `activities`

**Frontend Components:**
- ✅ `/src/lib/portal/components/ProjectOverview.tsx` - displays activity feed
- ✅ `/src/lib/portal/utils/activityLogger.ts` - activity logging utility

**Status:** ✅ **Implemented** | Needs backend persistence

**Priority:** **SHOULD HAVE** (MVP)

---

### US-035: Manage Project Status (Admin)
**As a** Motionify admin
**I want to** manually update project status
**So that** I can mark projects as completed or paused

**Acceptance Criteria:**
- [ ] Status dropdown: "In Progress" | "Completed" | "Archived" | "On Hold"
- [ ] Status change requires confirmation
- [ ] "Completed" status requires all deliverables approved (or admin override)
- [ ] "Archived" status requires "Completed" first (or admin override)
- [ ] Status visible on project card and overview
- [ ] Activity logged: "Project status changed to [status] by [admin]"
- [ ] Email notification sent to all project team members
- [ ] Status affects visibility in project list filters

**API Endpoints:**
- `PATCH /api/projects/:id/status`

**Database Tables:**
- `projects` - update `status` field

**Frontend Components:**
- ✅ `/src/lib/portal/components/ProjectManagerDashboard.tsx` - status management exists

**Status:** ✅ **Implemented** | Needs backend validation

**Priority:** **SHOULD HAVE** (MVP)

---

## Non-Functional Requirements

### NFR-001: Performance
- [ ] Page load time < 2 seconds on 4G connection
- [ ] Time to interactive < 3 seconds
- [ ] File uploads: 100MB file uploads in < 30 seconds
- [ ] API response time: < 500ms for 95th percentile
- [ ] Database queries optimized (N+1 prevention)
- [ ] Image optimization (Next.js Image component)
- [ ] Code splitting for faster initial load

**Priority:** **MUST HAVE** (MVP)

---

### NFR-002: Security
- [ ] HTTPS enforced for all connections
- [ ] JWT tokens with 30-day expiration
- [ ] HTTP-only cookies for session management
- [ ] CORS configured for production domains only
- [ ] Rate limiting on all API endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection
- [ ] File upload virus scanning (optional - Phase 2)
- [ ] Regular security audits

**Priority:** **MUST HAVE** (MVP)

---

### NFR-003: Accessibility
- [ ] WCAG 2.1 Level AA compliance
- [ ] Keyboard navigation support
- [ ] Screen reader compatible
- [ ] Color contrast ratios meet standards
- [ ] Focus indicators visible
- [ ] Alt text for all images
- [ ] Semantic HTML
- [ ] ARIA labels where needed

**Priority:** **SHOULD HAVE** (Post-MVP)

---

### NFR-004: Browser Support
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] Mobile Safari (iOS 14+)
- [ ] Mobile Chrome (Android 10+)

**Priority:** **MUST HAVE** (MVP)

---

### NFR-005: Scalability
- [ ] Support 100 concurrent users
- [ ] Support 50 active projects
- [ ] Support 10GB total file storage initially
- [ ] Cloudflare R2 scales automatically for storage
- [ ] Neon PostgreSQL autoscaling for database
- [ ] Netlify Functions autoscale for API

**Priority:** **MUST HAVE** (MVP)

---

### NFR-006: Monitoring & Logging
- [ ] Error tracking (Sentry or similar)
- [ ] Performance monitoring (Netlify Analytics)
- [ ] API endpoint monitoring
- [ ] Database query performance monitoring
- [ ] Email delivery tracking
- [ ] User analytics (privacy-friendly)

**Priority:** **SHOULD HAVE** (Post-MVP)

---

## Data Retention Policy

### General Principle
**Even if a team member is removed from the project, the tasks assigned/completed and comments added by them will still be present in the system.**

### Specific Retention Rules

#### When Team Member Removed from Project:
- ✅ **Keep:** All tasks created/assigned/completed by user
- ✅ **Keep:** All comments authored by user (with attribution)
- ✅ **Keep:** All files uploaded by user (with attribution)
- ✅ **Keep:** All activity log entries
- ✅ **Keep:** Historical project team membership record
- ❌ **Remove:** Active project access
- ❌ **Remove:** Future notifications for project

#### When User Deactivated from Platform:
- ✅ **Keep:** All historical data (tasks, comments, files, activities)
- ✅ **Keep:** User profile (marked as "Deactivated")
- ❌ **Remove:** Login access
- ❌ **Remove:** Personal email address (optional - GDPR compliance)
- ✅ **Display:** "Deactivated User" badge on historical contributions

#### When Project Deleted:
- ❌ **Remove:** All project data (cascade delete)
- ❌ **Remove:** Tasks, files (delete from R2), comments, activities
- ❌ **Remove:** Team assignments, notifications
- ✅ **Keep:** System audit log entry: "Project [name] deleted by [admin] on [date]"

#### When File Deleted:
- ❌ **Remove:** File from Cloudflare R2
- ❌ **Remove:** File metadata from database
- ✅ **Keep:** Activity log entry: "File [name] deleted by [user] on [date]"
- ❌ **Remove:** Associated file comments

---

## Implementation Priority Summary

### Phase 1: MVP (Weeks 1-6) - MUST HAVE
- ✅ US-001, US-002: Authentication (Magic Link, Sessions)
- ✅ US-004, US-005: Project Management (Create, View)
- ✅ US-009, US-010, US-012: Task Management (Create, Assign, Status)
- ✅ US-011: Task Following **[CRITICAL - NEW]**
- ✅ US-015, US-016: File Management (Upload, Download)
- ✅ US-020: Task Comments
- ✅ US-021: Team Invitations **[CRITICAL - ENHANCE]**
- ✅ US-023: Project Deliverables **[CRITICAL - NEW]**
- ✅ US-024: Revision Tracking **[CRITICAL - NEW]**
- ✅ US-025, US-026: Project Terms **[CRITICAL - NEW]**
- ✅ US-027, US-028, US-029: Deliverable Approvals **[CRITICAL - NEW]**
- ✅ US-030, US-031: Notifications (In-app, Email)
- ✅ US-033: User Management
- ✅ All NFRs (Performance, Security)

### Phase 2: Post-MVP (Weeks 7-9) - SHOULD HAVE
- US-003: User Profiles
- US-006: Archive Projects
- US-013: Advanced Task Filtering
- US-014: Delivery Notes
- US-017: File Organization
- US-019: File Comments
- US-032: Notification Preferences
- US-034: Activity Logs Export
- US-035: Project Status Management
- NFR-003: Accessibility

### Phase 3: Future (Week 10+) - COULD HAVE
- US-007: Delete Projects
- US-018: Rename Files
- Advanced Analytics Dashboard
- Meeting Management
- Time Tracking
- Project Templates
- Mobile App

---

## Summary Statistics

- **Total User Stories:** 35 core stories
- **MVP Stories:** 22 stories
- **Post-MVP Stories:** 10 stories
- **Future Stories:** 3 stories
- **New Critical Features Added:** 7 features (deliverables, revisions, approvals, terms, task following)
- **Implementation Timeline:** 11 weeks (extended from 10)
- **Estimated Cost:** $33,000-$34,000 (updated from $30,000)

---

## Notes

This document aligns with:
- ✅ Current codebase implementation (Next.js, TypeScript, React)
- ✅ Infrastructure setup (Neon PostgreSQL, Cloudflare R2, Amazon SES, Netlify)
- ✅ API documentation patterns (magic link auth)
- ✅ Implementation plan phases (with additions)
- ✅ Design guidelines (erik-kennedy-heuristics, design tokens)
- ✅ Timeline estimates (with adjustments)

**Last synced with codebase:** 2025-11-06