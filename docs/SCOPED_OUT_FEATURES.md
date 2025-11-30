# Scoped Out Features

**Last Updated**: 2025-11-14

This document tracks features that have been explicitly removed from the project scope. These features will NOT be implemented in the near future.

---

## Service Catalog

**Status**: ❌ Scoped Out
**Date Removed**: 2025-11-14
**Decision Made By**: Client

### Original Requirements (from client-requirements-doc.md 3.1.A.1):
- Pre-listed Motionify services with predefined templates, styles, durations, tones, and pricing
- Search, filter, and compare services before ordering
- Option to "Add Source File" as an additional scope

### Reason for Removal:
Client has decided to defer the service catalog feature. Project will proceed without a public-facing service browsing and selection interface.

### Impact:
- Clients will not be able to browse services through the portal
- Order creation will need to be handled through alternative means (direct admin creation, external website, etc.)
- Removes US-related stories for service discovery and comparison

### Related Files to Update:
- [x] docs/SCOPED_OUT_FEATURES.md (this file)
- [ ] docs/IMPLEMENTATION_PLAN.md - Remove service catalog tasks
- [ ] docs/user-stories.md - Mark related user stories as scoped out
- [ ] docs/api-documentation.md - Remove service catalog endpoints if any

---

## Notes

- This document should be reviewed before planning new features
- If a scoped-out feature is requested in the future, this document should be updated with the reactivation date
- Keep this file in sync with user stories and implementation plan
