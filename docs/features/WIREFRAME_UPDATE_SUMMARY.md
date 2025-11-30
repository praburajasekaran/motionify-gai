# Wireframe Files Update Summary

**Date:** November 2024  
**Status:** 6/12 Complete, 6 Remaining

## ✅ Completed Updates (6/12)

1. ✅ **inquiry-to-project/02-wireframes.md**  
   - UI standards section added
   - Routes updated to `portal.motionify.studio` format
   - Parameters standardized (`:projectId`, `:inquiryId`)
   - Navigation routes documented
   - Admin approval note added

2. ✅ **core-task-management/02-wireframes.md**  
   - UI standards section added
   - Routes updated to `portal.motionify.studio/projects/:projectId/tasks`
   - "Request Changes" terminology documented
   - File link navigation documented

3. ✅ **file-management/02-wireframes.md**  
   - UI standards section added
   - Routes updated to `portal.motionify.studio/projects/:projectId/files`
   - 500MB file size limit documented
   - Parameters standardized (`:projectId`, `:fileId`)

4. ✅ **deliverable-approval/02-wireframes.md**  
   - UI standards section added
   - Routes updated to `portal.motionify.studio/projects/:projectId`
   - 5GB admin upload limit documented (with explanation)
   - "Request Revision" terminology documented
   - Parameters updated (`:projectId`, `:deliverableId`)

5. ✅ **payment-workflow/02-wireframes.md**  
   - UI standards section added
   - All routes updated (client, admin, payment pages)
   - "Primary Contact" terminology documented
   - Parameters standardized (`:projectId`, `:paymentId`, `:deliverableId`)

6. ✅ **team-management/02-wireframes.md**  
   - UI standards section added
   - Routes updated to `portal.motionify.studio/projects/:projectId/team`
   - Parameters standardized (`:projectId`, `:userId`)

## ⏳ Remaining Updates (6/12)

7. ⏳ **feedback-and-revisions/02-wireframes.md**  
   - Need to add UI standards section
   - Update routes: `/portal/project/:id/tasks/:taskId` → `portal.motionify.studio/projects/:projectId/tasks/:taskId`
   - Update admin routes: `/admin/feedback`, `/admin/revision-requests/:id`

8. ⏳ **task-following/02-wireframes.md**  
   - Need to add UI standards section
   - Routes already use `/projects/:projectId/tasks/:taskId` format - just need subdomain prefix

9. ⏳ **project-terms-acceptance/02-wireframes.md**  
   - Need to add UI standards section
   - Update routes: `/projects/:id` → `portal.motionify.studio/projects/:projectId`
   - Update admin routes: `/admin/projects/:id/terms`

10. ⏳ **admin-features/02-wireframes.md**  
    - Need to add UI standards section
    - Update routes: `/admin/users`, `/admin/activity-logs`
    - Update project routes: `/projects/:id` → `portal.motionify.studio/projects/:projectId`

11. ⏳ **authentication-system/02-wireframes.md**  
    - Need to add UI standards section
    - Update routes: `/login`, `/profile`, `/auth/verify`
    - Note: These are public/auth routes, not project-specific

12. ⏳ **notifications-system/02-wireframes.md**  
    - Need to add UI standards section
    - Update routes: `/notifications`, `/settings/notifications`
    - Note: Notification bell documented as standard in all authenticated headers

## 📝 Notes

- **Route Pattern:** `portal.motionify.studio/projects/:projectId/...`
- **Admin Pattern:** `portal.motionify.studio/admin/...`
- **Parameters:** `:projectId`, `:taskId`, `:fileId`, `:deliverableId`, `:userId`, `:paymentId`
- **UI Standards:** Documented in each file header + WIREFRAME_CONFLICT_ANALYSIS.md

## Next Steps

1. Complete remaining 6 files with same standardization approach
2. Create STATUS_MAPPING.md document
3. Complete notification preferences audit

