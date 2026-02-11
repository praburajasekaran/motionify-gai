---
phase: PROD-04-deliverables-system
plan: 05
type: execute
wave: 3
depends_on:
  - PROD-04-01
  - PROD-04-02
  - PROD-04-03
  - PROD-04-04
files_modified: []
autonomous: false

must_haves:
  truths:
    - "Admin can upload 100MB file without timeout"
    - "Client downloads file correctly for own project"
    - "Client cannot download file from other project"
    - "Approval workflow transitions work correctly"
    - "File expiry shows graceful error message"
  artifacts: []
  key_links: []
---

<objective>
Manual testing verification of deliverables system production readiness.

Purpose: Verify all implemented security fixes and improvements work end-to-end through manual testing following the research checklist.

Output: Test results documented, any issues identified for follow-up.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-04-deliverables-system/PROD-04-RESEARCH.md
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Deliverables system security hardening (Plans 01-04):
- r2-presign key ownership validation (blocks cross-project file access)
- File size limits aligned at 100MB (schema, backend, frontend)
- Storage service with proper auth credentials
- Deliverables API permission validation
- Dynamic file expiry computation
  </what-built>
  <how-to-verify>
**Test Environment Setup:**
1. Start local dev server: `npm run dev`
2. Ensure you have test accounts for:
   - Admin (super_admin role)
   - Client A (with project containing deliverables)
   - Client B (with different project)

**DEL-01: Deliverable Creation** (as Admin)
- [ ] Create new deliverable linked to project
- [ ] Verify appears in database
- [ ] Upload file (< 100MB) -> key stored in beta_file_key
- [ ] Verify metadata saved correctly

**DEL-02: Approval Workflow** (as Client A)
- [ ] View beta deliverable in portal
- [ ] Video plays / thumbnail loads
- [ ] Request revisions -> status becomes 'rejected', email sent
- [ ] (Admin re-uploads) -> Approve -> status = 'approved'
- [ ] Verify approved_at timestamp set

**DEL-03: R2 File Storage**
- [ ] Upload 1MB file -> succeeds
- [ ] Upload 50MB file -> succeeds
- [ ] Upload 150MB file -> fails with clear error (over 100MB limit)
- [ ] Download file -> correct content returned
- [ ] Presigned URL expires after 1 hour (test if possible)

**DEL-04: Permissions** (CRITICAL SECURITY TESTS)
- [ ] Login as Client A
- [ ] Navigate to own project deliverables -> visible
- [ ] Try to access Client B's deliverable URL directly -> 403 error
- [ ] Try to download Client B's file key via r2-presign -> 403 ACCESS_DENIED
- [ ] Login as Admin -> can access all deliverables

**Security Tests:**
- [ ] Path traversal: `GET /api/r2-presign?key=../../etc/passwd` -> 400 INVALID_KEY
- [ ] Cross-project: Get key from Project A, request as Client B -> 403
- [ ] Rate limit: Make 21 r2-presign requests in 1 minute -> 429 response
  </how-to-verify>
  <resume-signal>
Type "all tests pass" if all checks succeed.
Type "issues found: [list issues]" to document problems for follow-up.
  </resume-signal>
</task>

</tasks>

<verification>
All manual testing completed and results documented.
</verification>

<success_criteria>
1. All DEL-01 checks pass (Deliverable Creation)
2. All DEL-02 checks pass (Approval Workflow)
3. All DEL-03 checks pass (R2 File Storage)
4. All DEL-04 checks pass (Permissions)
5. All Security Tests pass
6. No critical issues identified
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-04-deliverables-system/PROD-04-05-SUMMARY.md` with:
- Test results for each category
- Any issues discovered
- Follow-up actions if needed
</output>
