# Quick Start Guide for Claude

**Purpose**: Get Claude oriented quickly in any new session

**Read this first** when starting any work on Motionify PM Portal

---

## Project Overview

**What**: Video production project management portal for Motionify's clients
**Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
**Current Phase**: UI development with mock data (UX validation phase)
**Next Phase**: Backend development (after UX validated)

---

## Current Status (as of 2025-11-06)

### What's Built:
- ✅ **Frontend**: 63% complete (15 major UI components)
- ✅ **Design System**: Tailwind-based, being redesigned with Todoist aesthetic
- ✅ **State Management**: React Context API
- ✅ **Mock Data**: Fully functional prototypes
- ❌ **Backend**: Only 2 auth endpoints documented, not implemented
- ❌ **Database**: Schema designed but not deployed
- ❌ **External Services**: Not integrated (R2, SES, Neon)

### What Works (Mock Data):
- Project management dashboard
- Task management with state machine
- File upload/download UI
- Team management
- Notifications
- Activity feed
- Revision tracking UI

### What's Missing (Needs Building):
- Project deliverables management UI
- Project terms acceptance workflow
- Deliverable approval interface
- Task following system (follow button, followers list)
- Multi-assignee task UI
- Enhanced team invitation flow

---

## Key Directories

```
/motionify-portal/
├── landing-page/              # Main Next.js app
│   └── src/
│       ├── app/              # Next.js app router pages
│       │   ├── landing/     # Landing page
│       │   ├── login/       # Login page
│       │   └── portal/      # Main portal app
│       ├── components/       # Landing page components
│       └── lib/
│           └── portal/       # 🔥 MAIN PORTAL APPLICATION
│               ├── AppRoot.tsx         # Main app, context providers
│               ├── types.ts            # All TypeScript interfaces
│               ├── components/         # All portal components
│               │   ├── LoginScreen.tsx
│               │   ├── ProjectManagerDashboard.tsx
│               │   ├── ProjectOverview.tsx
│               │   ├── TaskList.tsx
│               │   ├── TaskItem.tsx
│               │   ├── Files.tsx
│               │   ├── NotificationBell.tsx
│               │   └── ...15 more components
│               └── utils/
│                   ├── taskStateTransitions.ts   # Task state machine
│                   └── activityLogger.ts         # Activity tracking
│
└── docs/                     # 📚 ALL DOCUMENTATION
    ├── CHANGES_LOG.md        # What changed when (START HERE)
    ├── QUICK_START.md        # This file
    ├── user-stories.md       # 35 user stories with acceptance criteria
    ├── IMPLEMENTATION_PLAN.md
    ├── api-documentation.md  # 60+ endpoints documented
    ├── FEATURE_STATUS_MATRIX.md  # Implementation status
    ├── ARCHITECTURE_DECISIONS.md
    ├── CODING_CONVENTIONS.md
    ├── COMPONENT_PATTERNS.md
    └── COMMON_ERRORS.md
```

---

## Important Files to Know

### Core Files (Read These First):

**`/landing-page/src/lib/portal/types.ts`**
- ALL TypeScript interfaces for the entire portal
- User, Project, Task, File, Deliverable, etc.
- If you need to understand data structure, start here

**`/landing-page/src/lib/portal/AppRoot.tsx`**
- Main application component
- Context providers (ProjectContext, UserContext)
- State management
- Routing logic

**`/landing-page/src/lib/portal/utils/taskStateTransitions.ts`**
- Task state machine
- Valid state transitions
- State validation logic
- DON'T bypass this - tasks have strict workflow

**`docs/FEATURE_STATUS_MATRIX.md`**
- What's implemented vs. planned
- Maps user stories → APIs → database → frontend
- Use this to check status before building

**`docs/CHANGES_LOG.md`**
- Recent changes history
- Read this to understand what was just worked on

---

## Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Check for errors

# Git (when Claude finishes work)
/done                    # Auto-update docs and commit

# Other slash commands
/update-changelog        # Update CHANGES_LOG.md
/new-adr                # Add architecture decision
/add-error              # Document a common error
/update-conventions     # Add coding rule
```

---

## Design Guidelines

### Current Design (Being Replaced):
- ⚠️ User dislikes current design
- Heavy, complex UI
- Too many shadows and colors

### Target Design (Todoist-Inspired):
- ✅ **Simple**: Minimal UI, generous whitespace
- ✅ **Robust**: Clean patterns, easy to maintain
- ✅ **Minimal**: No unnecessary decoration
- ✅ **8pt Grid**: All spacing in multiples of 8
- ✅ **Lucide Icons**: Always use Lucide React icons
- ✅ **System Fonts**: Prefer default fonts

**Reference**: See `docs/erik-kennedy-heuristics.md` for UI principles

---

## User Roles

| Role | Database Value | Description | Key Permissions |
|------|---------------|-------------|-----------------|
| **Motionify Admin** | `super_admin` | Full system access | Create projects, manage all users |
| **Motionify Team** | `project_manager` | Manage assigned projects | Create tasks, manage team |
| **Client Lead** | `client` + `is_primary_contact: true` | Client representative | Approve deliverables, accept terms |
| **Client Team** | `client` | Standard client | View, comment, upload files |

---

## State Management Pattern

**Use Context API** (already set up in AppRoot.tsx):
```typescript
// DON'T create new Context - use existing
import { ProjectContext } from './AppRoot'

// In component
const { projects, updateProject } = useContext(ProjectContext)
```

**State Updates**:
```typescript
// ✅ CORRECT - immutable update
setProject({ ...project, status: 'completed' })

// ❌ WRONG - mutation
project.status = 'completed'
```

---

## Task State Machine

**Valid Transitions** (enforced in taskStateTransitions.ts):
```
pending → in_progress
in_progress → awaiting_approval
in_progress → pending
awaiting_approval → completed
awaiting_approval → revision_requested
revision_requested → in_progress
completed → in_progress (admin only)
```

**DON'T** bypass the state machine. Always use:
```typescript
import { canTransition } from './utils/taskStateTransitions'

if (canTransition(currentStatus, newStatus, userRole)) {
  // OK to update
}
```

---

## Common Tasks

### Starting a New Feature:

1. Check `docs/FEATURE_STATUS_MATRIX.md` - is it already built?
2. Check `docs/user-stories.md` - what are the requirements?
3. Check `docs/ARCHITECTURE_DECISIONS.md` - any relevant decisions?
4. Check `docs/COMPONENT_PATTERNS.md` - follow existing patterns
5. Build feature
6. Update mock data in `types.ts` if needed
7. Run `/done` to auto-document changes

### Fixing a Bug:

1. Check `docs/COMMON_ERRORS.md` - is this a known issue?
2. Fix the bug
3. Add to `COMMON_ERRORS.md` if it's likely to recur
4. Run `/done`

### Making an Architectural Decision:

1. Consider the options
2. Make the decision
3. Run `/new-adr` to document it
4. Update `CODING_CONVENTIONS.md` if it creates new rules
5. Run `/done`

---

## What to Build Next

**Immediate Priority** (as of 2025-11-06):
1. **Design Overhaul**: Implement Todoist aesthetic across all components
2. **Missing Workflows**: Build 7 missing UI features (see FEATURE_STATUS_MATRIX.md)
3. **UX Validation**: Demo to stakeholders, gather feedback
4. **Backend**: After UX validated, build real backend

**See**: `docs/CHANGES_LOG.md` → "Next Session Focus" for latest priorities

---

## When You're Done Working

**ALWAYS run `/done` before ending session**

This will:
1. Analyze what you changed
2. Update `CHANGES_LOG.md`
3. Update relevant documentation
4. Create git commit
5. Send notification

**Don't forget!** Documentation only stays fresh if you update it.

---

## Getting Help

**Documentation to Read**:
- Confused about project structure? → This file
- Need to know what's built? → `FEATURE_STATUS_MATRIX.md`
- What should I build next? → `CHANGES_LOG.md` (Next Session Focus)
- How should I build it? → `user-stories.md` + `COMPONENT_PATTERNS.md`
- Why was this decision made? → `ARCHITECTURE_DECISIONS.md`
- What mistakes should I avoid? → `COMMON_ERRORS.md`

**File Not Sure Where to Find?**:
- Search in `/landing-page/src/lib/portal/` first
- Check `CHANGES_LOG.md` for recent changes
- Use `Grep` tool to search codebase

---

**Last Updated**: 2025-11-06
**Maintained By**: Claude (auto-updated with `/done` command)
