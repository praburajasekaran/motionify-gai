---
created: 2026-01-27T17:50
title: Add task deletion for admins and task creation for clients
area: api
files:
  - netlify/functions/tasks.ts:446-461
  - netlify/functions/tasks.ts:777-807
---

## Problem

Current task permissions have two gaps:

1. **Task Deletion:** Super Admins should be able to delete tasks created by themselves or any team member. Currently, task deletion exists but may lack proper permission checks for role-based access.

2. **Client Task Creation:** Clients are currently blocked from creating tasks (line 446-461 in tasks.ts returns 403 for client roles). However, clients should be able to create tasks for themselves and their team members within their own projects.

The current permission model:
- Only Motionify team can create tasks (clients get 403)
- Task deletion exists but permission scope unclear

## Solution

1. **Task Deletion Permissions:**
   - Super Admin: Can delete any task
   - Project Manager: Can delete tasks in projects they manage
   - Team Member: Can delete tasks they created
   - Client: Cannot delete tasks (or only their own?)

2. **Client Task Creation:**
   - Remove blanket 403 block for clients on task creation
   - Allow clients to create tasks within projects they own
   - Client-created tasks should be visible to client by default
   - Consider adding a flag to distinguish client-created vs team-created tasks

Need to decide on exact permission model before implementation.
