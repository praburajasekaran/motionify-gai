# ASCII Wireframes: Feedback & Revisions System

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId`, `:taskId`, `:fileId` (consistent naming)  
**Status Badges:** Colors only, hover for full label tooltips  
**Modal Close:** `[×]` for all modals  
**Terminology:** Use "Request Changes" for task-level feedback  
**Loading States:** `[Spinner]` notation

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Customer-Facing Screens

### SCREEN 1: Task with Comments Section

**Route:** `portal.motionify.studio/projects/:projectId/tasks/:taskId`
**Role:** All project team members can view and comment

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Task: Adjust color grading in final scene                               │
│ Status: In Progress    Assigned: @JaneDoe    Due: Tomorrow              │
└─────────────────────────────────────────────────────────────────────────┘

  Description:
  Update color grading to match new brand guidelines (vibrant blue)

  📎 Attachments: brand-guidelines.pdf

  ─────────────────────────────────────────────────────────────────────────

  💬 Comments (3)

  ┌───────────────────────────────────────────────────────────────────────┐
  │ @JohnSmith (Client)                                     2 hours ago    │
  ├───────────────────────────────────────────────────────────────────────┤
  │ Can we also adjust the saturation? The current version looks a bit    │
  │ washed out compared to our previous videos.                            │
  │                                                                         │
  │ @JaneDoe can you take a look?                                          │
  │                                                                         │
  │                                                [Edit]  [Delete]         │
  └───────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │ @JaneDoe (Motionify Studio Team)                              1 hour ago      │
  ├───────────────────────────────────────────────────────────────────────┤
  │ @JohnSmith Good catch! I'll increase the saturation by 15% and        │
  │ also boost the vibrance slightly. Will have an updated version for    │
  │ you by EOD.                                                            │
  │                                                                         │
  │                                                [Edit]  [Delete]         │
  └───────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │ @MikeDesigner (Motionify Studio Team)                        30 mins ago      │
  ├───────────────────────────────────────────────────────────────────────┤
  │ FYI - I updated the master template so all future videos will use     │
  │ these new color settings automatically. ✅                             │
  │                                                                         │
  │                                                [Edit]  [Delete]         │
  └───────────────────────────────────────────────────────────────────────┘


  Add a comment...
  ┌───────────────────────────────────────────────────────────────────────┐
  │ **Bold** _italic_ [link](url) `code`                                  │
  │                                                                         │
  │ @ - mention someone                                                    │
  └───────────────────────────────────────────────────────────────────────┘

                         ┌──────────┐  ┌────────────┐
                         │  Cancel  │  │  Comment   │
                         └──────────┘  └────────────┘
```

---

### SCREEN 2: File with Comments Section

**Route:** `portal.motionify.studio/projects/:projectId/files/:fileId`
**Role:** All project team members can view and comment

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎬 final-video-beta-v2.mp4                                     2.3 GB   │
│ Uploaded by @JaneDoe                                     3 hours ago     │
└─────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │                     [Video Player Preview]                             │
  │                     00:00 ─────●─── 02:15                              │
  │                                                                         │
  └───────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐  ┌──────────────┐
  │   Download   │  │   Share      │
  └──────────────┘  └──────────────┘

  ─────────────────────────────────────────────────────────────────────────

  💬 Comments (5)

  ┌───────────────────────────────────────────────────────────────────────┐
  │ @JohnSmith (Client)                                     2 hours ago    │
  ├───────────────────────────────────────────────────────────────────────┤
  │ The color correction looks **much better**! Love the vibrant blue.    │
  │                                                                         │
  │ However, at **0:42** the transition seems a bit abrupt. Can we        │
  │ add a fade?                                                            │
  │                                                                         │
  │                                                [Edit]  [Delete]         │
  └───────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │ @JaneDoe (Motionify Studio Team)                              1 hour ago      │
  ├───────────────────────────────────────────────────────────────────────┤
  │ @JohnSmith I'll add a 0.5s crossfade at 0:42. Will upload v3 in       │
  │ about an hour.                                                         │
  │                                                                         │
  │                                                [Edit]  [Delete]         │
  └───────────────────────────────────────────────────────────────────────┘


  Add a comment...
  ┌───────────────────────────────────────────────────────────────────────┐
  │ Type your feedback here... Use @ to mention someone                   │
  │                                                                         │
  └───────────────────────────────────────────────────────────────────────┘

                         ┌──────────┐  ┌────────────┐
                         │  Cancel  │  │  Comment   │
                         └──────────┘  └────────────┘
```

---

### SCREEN 3: Revision Request Modal

**Triggered:** Client clicks "Request Revision" on deliverable

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Request Revision: Final Video                                     [X]   │
└─────────────────────────────────────────────────────────────────────────┘

  What changes would you like to see? *

  ┌───────────────────────────────────────────────────────────────────────┐
  │ 1. At 0:42 - Add crossfade transition (currently too abrupt)          │
  │                                                                         │
  │ 2. At 1:15 - Increase logo size by 20% (hard to see on mobile)        │
  │                                                                         │
  │ 3. Final CTA - Extend duration from 3s to 5s                          │
  │                                                                         │
  │ 4. Overall - Bump saturation by 10% to match reference video          │
  └───────────────────────────────────────────────────────────────────────┘


  ℹ️  Revision Quota

      This will use 1 revision.

      Current: 1 of 3 revisions used
      After:   2 of 3 revisions used (1 remaining)


                    ┌──────────┐  ┌────────────────┐
                    │  Cancel  │  │  Submit Request │
                    └──────────┘  └────────────────┘
```

---

### SCREEN 4: Request Additional Revisions Modal

**Triggered:** Client clicks "Request Additional Revisions" when quota exhausted

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Request Additional Revisions                                      [X]   │
└─────────────────────────────────────────────────────────────────────────┘

  How many additional revisions do you need? *

  ┌─────────────────────────────┐
  │ 2 revisions             [▼] │
  └─────────────────────────────┘


  Why are additional revisions needed? *

  ┌───────────────────────────────────────────────────────────────────────┐
  │ Our marketing team reviewed the latest version and provided new       │
  │ feedback based on recent stakeholder input. The changes include:      │
  │                                                                         │
  │ - Repositioning key product shots per brand team guidance             │
  │ - Updating messaging to reflect Q1 2025 campaign language             │
  │ - Adjusting pacing based on test audience feedback                    │
  └───────────────────────────────────────────────────────────────────────┘

  (Minimum 100 characters required)


                    ┌──────────┐  ┌────────────────┐
                    │  Cancel  │  │  Submit Request │
                    └──────────┘  └────────────────┘
```

---

## Admin Screens

### SCREEN 5: Feedback Review Dashboard

**Route:** `portal.motionify.studio/admin/feedback`
**Role:** Admin only

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Feedback & Revision Requests                                             │
└─────────────────────────────────────────────────────────────────────────┘

  📬 Pending Revision Requests (3)

  ┌───────────────────────────────────────────────────────────────────────┐
  │ 🔴 Acme Corp Product Explainer                          2 hours ago    │
  ├───────────────────────────────────────────────────────────────────────┤
  │ Deliverable: Final Video                                              │
  │ Client: John Smith                                                    │
  │ Revisions: 2/3 used (1 remaining)                                     │
  │                                                                         │
  │ Feedback: "Adjust transitions at 0:42 and 1:15, increase logo..."    │
  │                                                                         │
  │            ┌──────────────┐  ┌────────────────────────┐               │
  │            │  View Details │  │  Start Working On This │               │
  │            └──────────────┘  └────────────────────────┘               │
  └───────────────────────────────────────────────────────────────────────┘


  💬 Recent Comments (Last 24 Hours)

  ┌───────────────────────────────────────────────────────────────────────┐
  │ Task: "Color correction Scene 2"                        30 mins ago    │
  │ @JohnSmith: "Can we also adjust the saturation?"                      │
  │                                          ┌──────────────┐              │
  │                                          │  View Task   │              │
  │                                          └──────────────┘              │
  └───────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 6: Additional Revision Approval Interface

**Route:** `portal.motionify.studio/admin/revision-requests/:id`
**Role:** Admin only

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Additional Revision Request                                              │
└─────────────────────────────────────────────────────────────────────────┘

  📋 Request Details

  Project: Acme Corp Product Explainer
  Client: John Smith
  Submitted: 2 hours ago


  📊 Current Quota: 3 total | 3 used | 0 remaining


  📝 Client Request

  Additional Revisions Requested: 2

  Reason:
  ┌───────────────────────────────────────────────────────────────────────┐
  │ Our marketing team provided new feedback based on stakeholder input...│
  └───────────────────────────────────────────────────────────────────────┘


  ⚙️  Admin Decision

  ☐ Approve 2 revisions (as requested)
  ☐ Approve different amount: ┌───┐ revisions
                                │ 1 │
                                └───┘
  ☐ Decline request


                 ┌──────────┐  ┌─────────────┐  ┌──────────────┐
                 │  Cancel  │  │  Decline    │  │  Approve     │
                 └──────────┘  └─────────────┘  └──────────────┘
```
