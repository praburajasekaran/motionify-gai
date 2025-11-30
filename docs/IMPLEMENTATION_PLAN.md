# Motionify PM Portal - Detailed Implementation Plan

## Project Overview

**Goal**: Build a comprehensive project management portal for Motionify's video production clients with passwordless authentication, file management, task tracking, deliverable approval workflows, and revision management.

**Updated Timeline**: 11 weeks (extended from 10 to include critical workflow features)
**Updated Cost**: $33,000-$34,000 (from $30,000)

**Current State**:
- ✅ Documentation complete (API, deployment, setup guides)
- ✅ User stories reconciled with implementation plan
- ✅ Project structure initialized
- ✅ Frontend prototype complete (Next.js 16, React 19, TypeScript)
- ⚠️ Missing: Backend implementation, database schema, authentication system
- ⚠️ Critical additions: Deliverable tracking, revision workflows, project terms acceptance

---

## Phase 1: Foundation & Infrastructure (Week 1-2)

### 1.1 Project Setup & Configuration
**Duration**: 2-3 days

#### Tasks:
- [ ] **Create package.json files**
  - Root package.json for Netlify Functions dependencies
  - Client package.json for React frontend dependencies
  - Install core dependencies (React, Vite, Tailwind, etc.)

- [ ] **Environment Configuration**
  - Create `.env.example` template
  - Set up development environment variables
  - Configure Vite for development and production builds

- [ ] **Database Schema Implementation**
  - Create `database/schema.sql` with all tables
  - Core tables: users, sessions, magic_link_tokens
  - Project tables: projects, project_team, project_deliverables, project_terms
  - Task tables: tasks, task_assignments, task_followers, task_comments
  - File tables: files, file_comments
  - Workflow tables: revision_requests, deliverable_approvals, project_terms_acceptance
  - Activity tables: activities, notifications
  - Implement UUID extensions and indexes
  - Add sample data for testing

- [ ] **Netlify Configuration**
  - Create `netlify.toml` with build settings
  - Configure redirects and headers
  - Set up function routing

#### Dependencies:
- Neon PostgreSQL account setup
- Basic project structure

#### Deliverables:
- Working development environment
- Database schema deployed
- Build pipeline functional

---

### 1.2 Authentication System
**Duration**: 3-4 days

#### Tasks:
- [ ] **JWT Utilities**
  - Create `netlify/functions/utils/jwt.js`
  - Implement token generation, validation, and refresh
  - Add middleware for protected routes

- [ ] **Magic Link System**
  - Create `netlify/functions/auth-request-magic-link.js`
  - Create `netlify/functions/auth-verify-magic-link.js`
  - Implement token generation and email sending

- [ ] **Email Service**
  - Create `netlify/functions/utils/email.js`
  - Implement Mailtrap integration for development
  - Create email templates (magic link, notifications)

- [ ] **Session Management**
  - Implement session creation and cleanup
  - Add rate limiting for magic link requests
  - Create user authentication middleware

#### Dependencies:
- Mailtrap account setup
- Database schema deployed

#### Deliverables:
- Complete authentication flow
- Magic link email system
- Protected route middleware

---

### 1.3 Frontend Authentication UI
**Duration**: 2-3 days

#### Tasks:
- [ ] **Login Page**
  - Create `client/src/pages/Login.jsx`
  - Implement email input and "Remember me" checkbox
  - Add loading states and error handling

- [ ] **Auth Verification Page**
  - Create `client/src/pages/AuthVerify.jsx`
  - Handle magic link verification
  - Redirect to dashboard on success

- [ ] **Authentication Context**
  - Create `client/src/contexts/AuthContext.jsx`
  - Implement user state management
  - Add token storage and validation

- [ ] **Protected Route Component**
  - Create `client/src/components/ProtectedRoute.jsx`
  - Implement route protection logic
  - Add loading and error states

#### Dependencies:
- Authentication backend complete
- React Router setup

#### Deliverables:
- Complete login flow UI
- User authentication state management
- Protected routing system

---

## Phase 2: Core Features (Week 3-4)

### 2.1 User Management & Team Invitations
**Duration**: 4-5 days **(+1 day for invitation system)**

#### Tasks:
- [ ] **User Dashboard**
  - Create `client/src/pages/Dashboard.jsx`
  - Display user info, role, and recent activity
  - Show assigned projects
  - Add navigation sidebar

- [ ] **User Profile Management**
  - Create `client/src/pages/Profile.jsx`
  - Allow users to update their information
  - Implement profile picture upload (optional)
  - Notification preferences

- [ ] **Admin User Management**
  - Create admin interface for user management
  - Implement user role assignment
  - Add user creation and editing
  - **NEW**: Soft delete (deactivate) users with data retention
  - Show deactivated users separately

- [ ] **Team Invitation System (CRITICAL - NEW)**
  - Create `netlify/functions/invitations.js`
  - Generate unique invitation links (valid 7 days)
  - Email invitation with project details
  - Track invitation status (pending/accepted/revoked)
  - Client primary contact can invite client team
  - Admin can invite Motionify team
  - **API Endpoints**:
    - `POST /api/projects/:id/invitations`
    - `GET /api/projects/:id/invitations`
    - `POST /api/invitations/:token/accept`
    - `DELETE /api/invitations/:id` (revoke)
    - `POST /api/invitations/:id/resend`

- [ ] **Team Management UI**
  - Create team management modal
  - Show current team members with roles
  - "Invite Team Member" button
  - Pending invitations list
  - Remove team member with confirmation
  - **NEW**: Data retention notice when removing members

- [ ] **User API**
  - Create `netlify/functions/users.js`
  - Implement user CRUD operations
  - Add role-based access control
  - Soft delete with `is_active` flag
  - Project team assignment/removal

#### Dependencies:
- Authentication system complete
- Database schema deployed

#### Deliverables:
- User dashboard and profile management
- Admin user management interface
- User management API

---

### 2.2 Project Management System
**Duration**: 5-6 days **(+1 day for deliverables & revisions)**

#### Tasks:
- [ ] **Project CRUD Operations**
  - Create `netlify/functions/projects.js`
  - Implement project creation, reading, updating, deletion
  - Add project member management
  - **NEW**: Include deliverables configuration in project creation
  - **NEW**: Include revision count setting (default: 3)
  - **NEW**: Assign client primary contact

- [ ] **Project Deliverables API**
  - Create `netlify/functions/deliverables.js`
  - Implement deliverable CRUD operations
  - Link deliverables to tasks and files
  - Track deliverable status based on task completion
  - **API Endpoints**:
    - `POST /api/projects/:id/deliverables`
    - `GET /api/projects/:id/deliverables`
    - `PATCH /api/deliverables/:id`
    - `DELETE /api/deliverables/:id` (with validation)

- [ ] **Revision Tracking System**
  - Implement revision count management in projects table
  - Track used vs total revisions
  - Create API endpoint for requesting additional revisions
  - Add admin endpoint to approve/add revisions
  - **API Endpoints**:
    - `GET /api/projects/:id/revisions`
    - `POST /api/projects/:id/revisions/add` (admin only)

- [ ] **Project Dashboard**
  - Create `client/src/pages/ProjectDashboard.jsx`
  - Display project overview, timeline, and status
  - Show project members and their roles
  - **NEW**: Display deliverables with status
  - **NEW**: Show revision count (X of Y used)
  - **NEW**: Highlight client primary contact

- [ ] **Project List & Creation**
  - Create `client/src/pages/Projects.jsx`
  - List all user's projects with filtering
  - Implement project creation form with:
    - Project details (name, description, dates)
    - Deliverables (multiple, with descriptions)
    - Revision count setting
    - Client primary contact selection
    - Team member assignments

- [ ] **Project Settings**
  - Create `client/src/pages/ProjectSettings.jsx`
  - Allow project configuration and member management
  - Implement project status updates
  - **NEW**: Manage deliverables (add, edit, remove with validation)
  - **NEW**: Adjust revision counts (admin only)

#### Dependencies:
- User management system
- File upload system (for project assets)

#### Deliverables:
- Complete project management system
- Project dashboard and settings
- Project member management

---

### 2.3 Task Management System
**Duration**: 4-5 days **(+1 day for following system & multi-assignee)**

#### Tasks:
- [ ] **Task API**
  - Create `netlify/functions/tasks.js`
  - Implement task CRUD operations
  - **NEW**: Support multiple assignees per task
  - Add task status updates with state machine validation
  - Link tasks to deliverables (required)
  - **API Endpoints**:
    - `POST /api/projects/:id/tasks`
    - `GET /api/projects/:id/tasks`
    - `PATCH /api/tasks/:id`
    - `DELETE /api/tasks/:id`
    - `PATCH /api/tasks/:id/status`
    - `POST /api/tasks/:id/assign` (multi-assignee support)
    - `DELETE /api/tasks/:id/assign/:userId`

- [ ] **Task Following System (CRITICAL - NEW)**
  - Implement task_followers table
  - Create following/unfollowing API endpoints
  - Auto-follow tasks when assigned
  - Track followers separately from assignees
  - Send notifications to all followers
  - **API Endpoints**:
    - `POST /api/tasks/:id/follow`
    - `DELETE /api/tasks/:id/follow`
    - `GET /api/tasks/:id/followers`

- [ ] **Task Board Interface**
  - Create `client/src/pages/TaskBoard.jsx`
  - Implement Kanban-style task board
  - Add drag-and-drop functionality
  - **NEW**: Show multiple assignees per task
  - **NEW**: Display follower count
  - Group tasks by deliverable

- [ ] **Task Creation & Editing**
  - Create `client/src/components/TaskModal.jsx`
  - Implement task creation and editing forms
  - **NEW**: Multi-select for task assignees
  - Add deliverable dropdown (required)
  - Add task visibility toggle (client-visible/internal)
  - Add delivery notes field
  - Add due date management

- [ ] **Task Filtering & Search**
  - Add task filtering by status, assignee, priority
  - **NEW**: Filter by "My Tasks" | "All Tasks" | "Followed Tasks" | "Unassigned"
  - Filter by deliverable
  - Implement task search functionality
  - Add task sorting options

- [ ] **Task Comments**
  - Create `netlify/functions/task-comments.js`
  - Implement comment CRUD operations
  - Support markdown formatting
  - @ mentions for notifications
  - Comment edit/delete with time limits

#### Dependencies:
- Project management system
- User management system

#### Deliverables:
- Complete task management system
- Interactive task board
- Task creation and editing interface

---

## Phase 3: File Management & Communication (Week 5-6)

### 3.1 File Upload & Management
**Duration**: 4-5 days

#### Tasks:
- [ ] **Cloudflare R2 Integration**
  - Set up R2 bucket and API credentials
  - Create `netlify/functions/utils/r2.js`
  - Implement presigned URL generation

- [ ] **File Upload API**
  - Create `netlify/functions/files.js`
  - Implement file upload, download, and deletion
  - Add file metadata management

- [ ] **File Upload UI**
  - Create `client/src/components/FileUpload.jsx`
  - Implement drag-and-drop file upload
  - Add upload progress and error handling

- [ ] **File Management Interface**
  - Create `client/src/pages/Files.jsx`
  - Display file list with filtering and search
  - Implement file preview and download

- [ ] **File Organization**
  - Implement folder structure for projects
  - Add file categorization (deliverables, assets, etc.)
  - Create file sharing and permissions

#### Dependencies:
- Cloudflare R2 account setup
- Project management system

#### Deliverables:
- Complete file management system
- File upload and organization interface
- File sharing and permissions

---

### 3.2 Messaging System
**Duration**: 3-4 days

#### Tasks:
- [ ] **Message API**
  - Create `netlify/functions/messages.js`
  - Implement message CRUD operations
  - Add message threading and replies

- [ ] **Real-time Communication**
  - Implement WebSocket or Server-Sent Events
  - Add real-time message updates
  - Create notification system

- [ ] **Message Interface**
  - Create `client/src/pages/Messages.jsx`
  - Implement chat-like interface
  - Add message composition and editing

- [ ] **Message Attachments**
  - Integrate file attachments with messages
  - Add image preview in messages
  - Implement attachment download

#### Dependencies:
- File management system
- User management system

#### Deliverables:
- Complete messaging system
- Real-time communication
- Message attachments

---

### 3.3 Project Terms & Deliverable Approval Workflows (CRITICAL - NEW)
**Duration**: 4-5 days

#### Tasks:
- [ ] **Project Terms System**
  - Create `netlify/functions/project-terms.js`
  - Implement project terms CRUD operations
  - Terms version tracking for revisions
  - Client acceptance tracking with timestamps
  - **API Endpoints**:
    - `GET /api/projects/:id/terms`
    - `POST /api/projects/:id/terms/accept` (client primary contact only)
    - `POST /api/projects/:id/terms/request-revision` (client)
    - `PATCH /api/projects/:id/terms` (admin updates terms)

- [ ] **Project Terms UI**
  - Create onboarding modal for client primary contact
  - Display project terms (scope, deliverables, revisions, timeline)
  - "Accept Terms" button with confirmation
  - "Request Changes" option with comment box
  - Block project access until terms accepted
  - Show terms revision history

- [ ] **Deliverable Approval API**
  - Create `netlify/functions/deliverable-approvals.js`
  - Implement approve/reject deliverable endpoints
  - Track approval status and timestamps
  - Link approvals to revision usage
  - **API Endpoints**:
    - `POST /api/deliverables/:id/approve` (client primary contact)
    - `POST /api/deliverables/:id/reject` (with feedback)
    - `GET /api/projects/:id/deliverables/status`

- [ ] **Deliverable Approval UI**
  - Show "Approve" button when all deliverable tasks are "Awaiting Approval"
  - Approval confirmation modal with optional feedback
  - "Request Revision" button with required comment
  - Display deliverable approval status (✅ Approved, ⏳ Awaiting, 🔄 Revision Requested)
  - Update project progress based on approved deliverables

- [ ] **Revision Request System**
  - Implement revision count decrement on rejection
  - Create "Request Additional Revisions" flow when quota exhausted
  - Admin approval/rejection of additional revision requests
  - Atomic check-and-update to prevent race conditions
  - **API Endpoints**:
    - `POST /api/deliverables/:id/request-revision` (uses revision count)
    - `POST /api/projects/:id/revisions/request-additional`
    - `PATCH /api/projects/:id/revisions/approve-request` (admin)
    - `PATCH /api/projects/:id/revisions/decline-request` (admin)

- [ ] **Workflow Notifications**
  - Email notification when client accepts terms
  - Email notification when client requests term changes
  - Email notification when deliverable approved
  - Email notification when revision requested
  - Email notification when additional revisions requested/approved
  - In-app notifications for all workflow events

#### Dependencies:
- Project deliverables system (Phase 2)
- Revision tracking system (Phase 2)
- Email notification system

#### Deliverables:
- Complete project terms acceptance workflow
- Deliverable approval system
- Revision request/approval system
- Workflow email notifications

---

## Phase 4: Advanced Features (Week 7-8)

### 4.1 Meeting Management
**Duration**: 2-3 days

#### Tasks:
- [ ] **Meeting API**
  - Create `netlify/functions/meetings.js`
  - Implement meeting CRUD operations
  - Add meeting scheduling and reminders

- [ ] **Meeting Interface**
  - Create `client/src/pages/Meetings.jsx`
  - Implement meeting calendar view
  - Add meeting creation and editing

- [ ] **Meeting Integration**
  - Integrate with calendar systems (Google Calendar, Outlook)
  - Add meeting link generation
  - Implement meeting reminders

#### Dependencies:
- User management system
- Project management system

#### Deliverables:
- Meeting management system
- Calendar integration
- Meeting scheduling interface

---

### 4.2 Notification System
**Duration**: 2-3 days

#### Tasks:
- [ ] **Notification API**
  - Create `netlify/functions/notifications.js`
  - Implement notification CRUD operations
  - Add notification preferences

- [ ] **Email Notifications**
  - Implement email notification system
  - Create notification templates
  - Add notification preferences

- [ ] **In-App Notifications**
  - Create `client/src/components/NotificationCenter.jsx`
  - Implement real-time notifications
  - Add notification management

#### Dependencies:
- Email system (SES)
- All core features

#### Deliverables:
- Complete notification system
- Email and in-app notifications
- Notification preferences

---

### 4.3 Analytics & Reporting
**Duration**: 2-3 days

#### Tasks:
- [ ] **Analytics API**
  - Create `netlify/functions/analytics.js`
  - Implement project analytics
  - Add user activity tracking

- [ ] **Analytics Dashboard**
  - Create `client/src/pages/Analytics.jsx`
  - Display project metrics and charts
  - Add user activity reports

- [ ] **Reporting System**
  - Implement project reports
  - Add export functionality
  - Create scheduled reports

#### Dependencies:
- All core features
- Database with activity tracking

#### Deliverables:
- Analytics dashboard
- Reporting system
- Project metrics

---

## Phase 5: Production Deployment (Week 9-10)

### 5.1 Production Setup
**Duration**: 3-4 days

#### Tasks:
- [ ] **Environment Configuration**
  - Set up production environment variables
  - Configure Amazon SES for production emails
  - Set up Cloudflare R2 for production file storage

- [ ] **Database Migration**
  - Deploy database schema to production
  - Migrate any development data
  - Set up database backups

- [ ] **Domain Configuration**
  - Set up custom domain (portal.motionify.studio)
  - Configure SSL certificates
  - Set up DNS records

#### Dependencies:
- All features complete
- Production accounts set up

#### Deliverables:
- Production environment configured
- Custom domain active
- SSL certificates installed

---

### 5.2 Testing & Quality Assurance
**Duration**: 2-3 days

#### Tasks:
- [ ] **End-to-End Testing**
  - Test complete user flows
  - Verify all features work in production
  - Test email delivery and file uploads

- [ ] **Performance Testing**
  - Test page load times
  - Verify file upload performance
  - Test concurrent user scenarios

- [ ] **Security Testing**
  - Verify authentication security
  - Test file upload security
  - Check for common vulnerabilities

#### Dependencies:
- Production environment
- All features implemented

#### Deliverables:
- Production-ready application
- Security and performance verified
- User acceptance testing complete

---

### 5.3 Launch & Documentation
**Duration**: 1-2 days

#### Tasks:
- [ ] **User Documentation**
  - Create user guides and tutorials
  - Document all features and workflows
  - Create video tutorials

- [ ] **Team Training**
  - Train Motionify team on portal features
  - Create admin documentation
  - Set up support processes

- [ ] **Launch Preparation**
  - Create initial user accounts
  - Set up monitoring and alerts
  - Prepare launch announcement

#### Dependencies:
- Production testing complete
- All documentation ready

#### Deliverables:
- Complete user documentation
- Team training complete
- Application launched

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context + useReducer
- **HTTP Client**: Fetch API
- **File Upload**: Direct to R2 with presigned URLs

### Backend Stack
- **Runtime**: Node.js (Netlify Functions)
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT + Magic Links
- **Email**: Amazon SES
- **File Storage**: Cloudflare R2
- **Deployment**: Netlify

### Database Schema

#### Core Authentication Tables:
- **users**: User authentication and profile data (includes `is_active` for soft delete)
- **sessions**: User session management
- **magic_link_tokens**: Passwordless authentication tokens

#### Project Management Tables:
- **projects**: Project information, settings, revision counts (`total_revisions`, `used_revisions`)
- **project_team**: Team member assignments with roles and `is_primary_contact` flag
- **project_deliverables**: Deliverables per project with status tracking
- **project_terms**: Project terms with version tracking
- **project_terms_acceptance**: Client acceptance records with timestamps
- **project_invitations**: Team invitation tokens and status

#### Task Management Tables:
- **tasks**: Task information linked to deliverables
- **task_assignments**: Multiple assignees per task support
- **task_followers**: Task following system (separate from assignments)
- **task_comments**: Comments on tasks with markdown support

#### File Management Tables:
- **files**: File metadata and Cloudflare R2 references
- **file_comments**: Comments on files

#### Workflow Tables:
- **revision_requests**: Revision request tracking
- **deliverable_approvals**: Approval/rejection records for deliverables
- **additional_revision_requests**: Requests for extra revisions beyond quota

#### Communication Tables:
- **messages**: Inter-team messaging (optional - may use task comments instead)
- **notifications**: In-app notifications
- **activities**: Audit trail and activity feed

#### Indexes & Constraints:
- Foreign keys with CASCADE/RESTRICT based on data retention policy
- Indexes on frequently queried fields (project_id, user_id, status, deliverable_id)
- UUID primary keys for all tables
- Timestamps (created_at, updated_at) on all tables

---

## Risk Assessment & Mitigation

### High Risk
1. **Authentication Security**
   - Risk: Magic link vulnerabilities
   - Mitigation: Implement rate limiting, token expiration, secure email delivery

2. **File Upload Security**
   - Risk: Malicious file uploads
   - Mitigation: File type validation, virus scanning, secure presigned URLs

3. **Database Performance**
   - Risk: Slow queries with large datasets
   - Mitigation: Proper indexing, query optimization, connection pooling

### Medium Risk
1. **Email Delivery**
   - Risk: Emails going to spam
   - Mitigation: Proper SES setup, domain verification, email templates

2. **File Storage Costs**
   - Risk: Unexpected storage costs
   - Mitigation: File retention policies, cost monitoring, R2 optimization

3. **User Experience**
   - Risk: Complex interface for clients
   - Mitigation: User testing, simplified workflows, comprehensive documentation

---

## Success Metrics

### Technical Metrics
- Page load time < 3 seconds
- 99.9% uptime
- Zero security vulnerabilities
- File upload success rate > 99%

### User Metrics
- User adoption rate > 80%
- Task completion rate improvement
- Client satisfaction score > 4.5/5
- Support ticket reduction > 50%

### Business Metrics
- Project delivery time reduction
- Client communication efficiency
- Team productivity improvement
- Cost savings from automation

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 2 weeks | Authentication system, database schema (with new tables), basic UI |
| Phase 2 | 2.5 weeks | User management + invitations, projects + deliverables + revisions, tasks + following |
| Phase 3 | 2.5 weeks | File management, messaging, **project terms**, **deliverable approvals** |
| Phase 4 | 2 weeks | Meetings, notifications, analytics |
| Phase 5 | 2 weeks | Production deployment, testing, launch |

**Total Timeline**: 11 weeks (2.75 months)

### Timeline Changes from Original Plan:
- **+1 week total** to accommodate critical workflow features
- Phase 2: +0.5 weeks for deliverables, revisions, task following, invitations
- Phase 3: +0.5 weeks for project terms and deliverable approval workflows
- **Estimated Cost Increase**: $3,000-$4,000 (from $30,000 to $33,000-$34,000)

---

## Next Steps

1. **Immediate Actions**:
   - Set up development environment
   - Create package.json files
   - Implement database schema
   - Begin authentication system

2. **Week 1 Goals**:
   - Complete project setup
   - Deploy database schema
   - Implement magic link authentication
   - Create basic login UI

3. **Success Criteria for Phase 1**:
   - Users can request and verify magic links
   - Authentication flow works end-to-end
   - Basic dashboard displays user information
   - Development environment is fully functional

---

**Last Updated**: 2025-11-06
**Status**: Updated with Critical Workflow Features
**Changes**: Added deliverable tracking, revision management, project terms, task following, team invitations
**Timeline**: Extended to 11 weeks (from 10 weeks)
**Cost**: Updated to $33,000-$34,000 (from $30,000)
**Next Review**: After Phase 1 completion
