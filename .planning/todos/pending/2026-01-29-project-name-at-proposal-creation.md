---
created: 2026-01-29T12:00
title: Superadmin gives project name at proposal creation
area: ui
files:
  - pages/admin/ProposalDetail.tsx
  - netlify/functions/proposals.ts
---

## Problem

Currently, the project name is not set by the superadmin at proposal creation time. When a proposal is created and eventually accepted, the resulting project may not have a meaningful name assigned upfront. The superadmin should be able to specify the project name during proposal creation so it carries through the workflow.

## Solution

TBD — likely add a "Project Name" field to the proposal creation/edit form in the admin portal. This name would be stored on the proposal and used when creating the project upon acceptance.
