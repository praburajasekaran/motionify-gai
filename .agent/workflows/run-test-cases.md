---
description: Execute Motionify portal test cases, implement missing features, and update test documentation
---

# Motionify Test Case Execution Workflow

## Overview
This workflow guides you through finding pending test cases, testing them against the running application, implementing missing functionality if needed, and updating the test cases document with results.

## Prerequisites
- The development server must be running (`npm run dev:all`)
- Browser access to test the application at `http://localhost:3000` (or configured port)
- Write access to `docs/MOTIONIFY-PORTAL-TEST-CASES.md`

---

## Step 1: Read and Identify Pending Test Cases

1. Open `docs/MOTIONIFY-PORTAL-TEST-CASES.md`
2. Look for test cases with these status indicators:
   - ⏳ **NOT STARTED** - Planned but not yet built
   - ❌ **NOT IMPLEMENTED** - Feature not available
   - 🚫 **BLOCKED** - Cannot proceed due to dependencies
3. Note the Test Case IDs (e.g., TC-AUTH-001, TC-PM-001) that need attention
4. Refer to the **Status Summary** at the top for a quick overview

---

## Step 2: Analyze Test Case Requirements

For each pending test case:
1. Read the **Test Steps** section carefully
2. Note the **Expected Results** with checkmarks (✅) or crosses (❌)
3. Check the **Status** notes for implementation hints
4. Identify the **Priority** (Critical, High, Medium, Low)
5. Check if the test case is **BLOCKED** by other requirements

---

## Step 3: Test Against Live Application

// turbo
1. Open the browser to the application URL (`http://localhost:3000`)
2. Follow the **Test Steps** exactly as documented
3. For each **Expected Result**:
   - ✅ Mark as PASS if the result matches
   - ❌ Mark as FAIL if the result doesn't match
   - Note any discrepancies or bugs found
4. Take screenshots of failures for documentation

---

## Step 4: Implement Missing Functionality (If Required)

If the test reveals missing functionality:

1. **Locate the relevant code files:**
   - Check the test case status notes for file hints (e.g., "Implemented in `TaskList.tsx`")
   - Use grep to find relevant components in `src/components/`

2. **Implement the missing feature:**
   - Follow any implementation notes in the test case
   - Keep changes minimal and focused on the test case requirements
   - Consider the user roles: Super Admin, Project Manager, Team Member, Client Primary Contact, Client Team Member

3. **Verify the implementation:**
   - Re-run the test steps
   - Ensure all expected results pass

---

## Step 5: Update the Test Cases Document

After testing/implementing, update `docs/MOTIONIFY-PORTAL-TEST-CASES.md`:

### 5.1 Update Individual Test Case Status

Change the status marker based on results:
- `✅ COMPLETE` - All expected results pass
- `⏳ NOT STARTED` - Feature not yet built
- `❌ NOT IMPLEMENTED` - Feature explicitly not available
- `🚫 BLOCKED` - Cannot proceed due to dependencies

### 5.2 Update the Status Summary

Update the summary counts at the top of the document:
```markdown
**Status Summary:**
- ✅ Complete: XX
- ⏳ Not Started: XX
- ❌ Not Implemented: XX
- 🚫 Blocked: XX
```

### 5.3 Add Implementation Notes

If you made changes, update the test case status line:
```markdown
**Status:** ✅ Implemented in `ComponentName.tsx`
```

---

## Step 6: Commit Changes

// turbo
After updating the document and any code:
```bash
git add docs/MOTIONIFY-PORTAL-TEST-CASES.md
git add <any-modified-source-files>
git commit -m "Test: TC-XX-XXX - [brief description of what was tested/implemented]"
```

---

## Quick Reference: Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Complete** - Built and tested |
| ⏳ | **Not Started** - Planned but not yet built |
| ❌ | **Not Implemented** - Feature explicitly unavailable |
| 🚫 | **Blocked** - Cannot proceed due to dependencies |

---

## Test Categories

| Category | Test ID Prefix | Description |
|----------|----------------|-------------|
| Authentication | TC-AUTH-xxx | Login, session, logout |
| Project Management | TC-PM-xxx | Create, view, archive projects |
| Task Management | TC-TM-xxx | Tasks, approvals, revisions |
| File Management | TC-FM-xxx | Upload, download, comments |
| Deliverable & Approval | TC-DA-xxx | Beta review, approvals, payments |
| Team Collaboration | TC-TC-xxx | Comments, mentions, notifications |

---

## Tips

1. **Prioritize Critical and High priority test cases first**
2. **Group related test cases** - Test a whole category at once when possible
3. **Check for BLOCKED status** - Some test cases depend on backend implementation
4. **Use the browser subagent** for automated UI testing
5. **Document everything** - Note file locations and implementation details

---

## Example Usage

To run this workflow, say:
```
/run-test-cases
```

Or specify a category:
```
Run test cases for TC-AUTH-001 to TC-AUTH-007 (Authentication Tests)
```

Or specify individual tests:
```
Run test case TC-PM-003 (Archive Completed Project)
```
