# Architecture Decision Records (ADRs)

**Purpose**: Document important architectural and design decisions

**Why**: Future Claude (and developers) need to understand WHY decisions were made, not just WHAT was decided

**How to Use**:
- Run `/new-adr` to add new decision
- Each ADR is numbered sequentially (ADR-001, ADR-002, etc.)
- Status can be: Proposed, Accepted, Deprecated, Superseded

---

## ADR-001: UI-First Development Approach

**Date**: 2025-11-06
**Status**: ✅ Accepted
**Deciders**: User, Claude

### Context
- Frontend prototype already 63% complete with mock data
- User wants to validate user flows with stakeholders before committing to backend architecture
- Non-technical user prefers to see and interact with UI
- Backend development is expensive and time-consuming to change

### Decision
Build complete UI with mock data first, then build backend for all features at once.

**Development Phases**:
1. **Phase 1** (4 weeks): Complete all UI with mock data
2. **Phase 2** (UX validation): Demo to stakeholders, gather feedback, iterate
3. **Phase 3** (7 weeks): Build backend for all features
4. **Phase 4** (Launch): Production deployment

### Consequences

**Positive**:
- ✅ Faster iteration on UX (no backend to rebuild)
- ✅ Stakeholders can see and interact with full app early
- ✅ Frontend and backend can be built by different teams in parallel
- ✅ Requirements are clearer after UX validation
- ✅ Less expensive to make changes before backend is built

**Negative**:
- ❌ Can't test real workflows end-to-end until Phase 3
- ❌ Need migration from mock data to real API calls
- ❌ Risk of discovering technical limitations late

**Mitigation**:
- Document API contracts now (api-documentation.md)
- Design data structures compatible with database schema
- Build frontend assuming APIs exist (easy to swap mock for real)

---

## ADR-002: Todoist-Inspired Design System

**Date**: 2025-11-06
**Status**: ✅ Accepted
**Deciders**: User

### Context
- User dislikes current UI design (too heavy, complex)
- Wants simple, minimal, robust aesthetic
- Referenced Todoist as ideal example
- Current design has too many shadows, colors, decorations

### Decision
Redesign entire portal UI with Todoist-inspired minimal aesthetic.

**Design Principles**:
- **Simple**: Minimal UI elements, only what's necessary
- **Robust**: Clean, maintainable patterns
- **Minimal**: Generous whitespace, subtle decorations
- **8pt Grid**: All spacing in multiples of 8px
- **Neutral Colors**: Grays + 1 brand color
- **Clean Typography**: System fonts, fewer font weights
- **Subtle Shadows**: Minimal depth, only where needed

### Consequences

**Positive**:
- ✅ Easier to maintain (fewer styles)
- ✅ Faster to build (simpler components)
- ✅ Better performance (less CSS)
- ✅ More professional appearance
- ✅ Follows modern design trends

**Negative**:
- ❌ Requires redesigning ALL existing components
- ❌ Need to update design-ui-notes.md
- ❌ Some features may need rethinking (less visual hierarchy)

**Implementation**:
- Start with design tokens (colors, spacing, typography)
- Redesign one component at a time
- Test readability and usability
- Document patterns in COMPONENT_PATTERNS.md

---

## ADR-003: React Context API for State Management

**Date**: 2025-11-06
**Status**: ✅ Accepted (Already Implemented)
**Deciders**: Previous development

### Context
- Need global state for projects, tasks, users
- Options: Redux, Zustand, Context API, React Query
- Prototype already using Context API
- Relatively simple state management needs

### Decision
Use React Context API for global state management.

**Implementation**:
- `ProjectContext` - manages all project data
- `UserContext` - manages auth and user data
- Contexts defined in `AppRoot.tsx`

### Consequences

**Positive**:
- ✅ No external dependencies
- ✅ Simple, easy to understand
- ✅ Good enough for current needs
- ✅ React built-in, well supported

**Negative**:
- ❌ Re-renders can be inefficient at scale
- ❌ No built-in dev tools
- ❌ May need to migrate to state management library later

**Future Consideration**:
- If performance issues arise, consider React Query for server state
- If state becomes complex, consider Zustand or Redux

---

## ADR-004: Task State Machine

**Date**: 2025-11-06
**Status**: ✅ Accepted (Already Implemented)
**Deciders**: Previous development

### Context
- Tasks have complex workflow with role-based transitions
- Need to enforce valid state changes
- Prevent invalid transitions (e.g., client can't mark task "In Progress")

### Decision
Implement strict task state machine in `taskStateTransitions.ts`.

**States**:
- `pending`
- `in_progress`
- `awaiting_approval`
- `revision_requested`
- `completed`

**Transitions Enforced**:
- Who can make each transition
- Valid source and target states
- Business logic validation

### Consequences

**Positive**:
- ✅ Prevents invalid workflows
- ✅ Clear business rules
- ✅ Centralized validation logic
- ✅ Easy to audit workflow

**Negative**:
- ❌ Rigid - hard to add ad-hoc transitions
- ❌ Must update state machine for new workflows

**Rule**:
- NEVER bypass the state machine
- Always use `canTransition()` before updating task status
- Document any new transitions added

---

## ADR-005: Passwordless Authentication (Magic Links)

**Date**: 2025-11-06
**Status**: ✅ Accepted (Documented, Not Implemented)
**Deciders**: Previous planning

### Context
- Users don't want to manage passwords
- Clients are often non-technical
- Need secure but simple authentication

### Decision
Use magic link (passwordless) authentication via email.

**Flow**:
1. User enters email
2. System sends magic link
3. User clicks link
4. System creates JWT session

**Security**:
- Magic links expire in 15 minutes
- One-time use only
- Rate limiting (3 requests/hour per email)
- JWT tokens for session management

### Consequences

**Positive**:
- ✅ No passwords to forget
- ✅ Simple user experience
- ✅ Reduces password-related support
- ✅ No password reset flows needed

**Negative**:
- ❌ Requires email access
- ❌ Email delivery can be slow
- ❌ Risk of email interception (mitigated by HTTPS)

**Requirements**:
- Amazon SES for email sending
- JWT secret management
- Rate limiting implementation

---

## ADR-006: Cloudflare R2 for File Storage

**Date**: 2025-11-06
**Status**: ✅ Accepted (Documented, Not Implemented)
**Deciders**: Previous planning

### Context
- Need to store video files (large, high bandwidth)
- Options: AWS S3, Cloudflare R2, Azure Blob
- Cost is a concern (egress fees)

### Decision
Use Cloudflare R2 for file storage.

**Why R2**:
- Zero egress fees (huge benefit for video downloads)
- S3-compatible API
- ~$3/month for 190GB (vs S3's ~$20/month with egress)
- Good for video production workflow (lots of downloads)

**Implementation**:
- Presigned URLs for direct client upload/download
- No files pass through backend (saves bandwidth)
- Metadata stored in PostgreSQL

### Consequences

**Positive**:
- ✅ Significant cost savings on bandwidth
- ✅ Fast global CDN
- ✅ S3-compatible (easy migration if needed)

**Negative**:
- ❌ Less mature than S3
- ❌ Fewer features than S3
- ❌ Vendor lock-in if using R2-specific features

---

## ADR-007: Self-Documenting Claude System

**Date**: 2025-11-06
**Status**: ✅ Accepted
**Deciders**: User, Claude

### Context
- User is non-technical, won't manually update documentation
- Documentation quickly becomes stale if not maintained
- Claude makes changes but user doesn't know which files changed
- Need system where documentation stays fresh automatically

### Decision
Claude is responsible for documenting its own work.

**System**:
1. Claude tracks what it changes during session
2. Before finishing, Claude runs `/done` command
3. Claude automatically:
   - Updates `CHANGES_LOG.md`
   - Updates relevant docs (ADRs, conventions, etc.)
   - Creates git commit with all changes
   - Sends notification to user

**Documentation Files**:
- `CHANGES_LOG.md` - What changed when
- `QUICK_START.md` - Orient future Claude quickly
- `ARCHITECTURE_DECISIONS.md` - This file
- `CODING_CONVENTIONS.md` - Rules to follow
- `COMPONENT_PATTERNS.md` - How to structure code
- `COMMON_ERRORS.md` - Mistakes to avoid

### Consequences

**Positive**:
- ✅ Documentation always up-to-date
- ✅ Future Claude sessions are productive immediately
- ✅ No manual effort from user
- ✅ Git history stays clean and descriptive
- ✅ Easier onboarding for new developers

**Negative**:
- ❌ Relies on Claude remembering to run `/done`
- ❌ Documentation can become verbose if over-documented

**Rules for Claude**:
- ALWAYS run `/done` before ending session
- Update `CHANGES_LOG.md` for every significant change
- Add ADR when making architectural decision
- Add to `COMMON_ERRORS.md` when fixing bugs
- Keep documentation concise and useful

---

## Template for New ADRs

```markdown
## ADR-XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded
**Deciders**: [Who made this decision]

### Context
[What's the situation? What problem are we solving? What options exist?]

### Decision
[What did we decide? Be specific.]

### Consequences

**Positive**:
- ✅ [Good outcome 1]
- ✅ [Good outcome 2]

**Negative**:
- ❌ [Trade-off or limitation 1]
- ❌ [Trade-off or limitation 2]

**Mitigation** (if applicable):
[How we'll address the negative consequences]
```

---

**Last Updated**: 2025-11-06
**How to Add**: Run `/new-adr <title>` command
**Maintained By**: Claude (auto-updated)