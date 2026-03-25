---
title: "Revisions Included Field Not Persisting"
date: 2026-01-30
category: integration-issues
tags:
  - proposals
  - netlify-functions
  - field-mapping
  - allowlist
  - dual-api
  - snake-case-mapping
module: proposals
severity: high
symptoms:
  - Admin edits revisions count but value reverts to default (2) after reload
  - 500 Internal Server Error on PUT to proposal-detail endpoint
  - "PostgreSQL error: column revisions_included of relation proposals does not exist"
---

# Revisions Included Field Not Persisting

## Problem

After adding a `revisionsIncluded` field across the full proposal lifecycle (database migration, TypeScript types, UI components, and API routes), the admin could set the value in the UI but it never persisted. The value always reverted to the default of 2 on page reload.

## Symptoms

1. Admin edits the revisions count (e.g., changes from 2 to 4), saves successfully, but the value displays as 2 after reloading the page.
2. Eventually: `500 Internal Server Error` on PUT requests to `/.netlify/functions/proposal-detail/{id}`.
3. PostgreSQL error in server logs: `column "revisions_included" of relation "proposals" does not exist`.

## Root Cause

Three separate issues were discovered incrementally, each masking the next.

### 1. Wrong API client file updated

The admin app (`pages/admin/`) imports from `lib/proposals.ts` at the project root, **not** from `landing-page-new/src/lib/proposals.ts`. The field was added to the latter but not the former. The root-level file was missing:

- `revisionsIncluded` in the `Proposal` interface
- `revisionsIncluded` in the `createProposal` parameter type
- `revisionsIncluded` to `revisions_included` mapping in `updateProposal`'s snake_case converter
- `revisions_included` to `revisionsIncluded` mapping in all 6 response mappers

### 2. Separate Netlify function for the detail endpoint

The admin app's update flow goes through `netlify/functions/proposal-detail.ts`, which is a completely separate file from `netlify/functions/proposals.ts`. The detail function has its own `allowedFields` whitelist for the PUT handler. Because `revisions_included` was not in this whitelist, the field was silently dropped during updates -- no error was thrown, the field simply never reached the database.

### 3. Database migration not executed

The migration file `013_add_revisions_included_to_proposals.sql` was created but had not been run against the active database. Once the first two issues were fixed, the update query reached PostgreSQL but failed because the `revisions_included` column did not yet exist.

## Solution

1. **Updated the root API client** -- Added `revisionsIncluded` to the `Proposal` interface, create parameter type, update snake_case mapping, and all 6 response mappers in `lib/proposals.ts`.
2. **Updated the Netlify function allowlist** -- Added `revisions_included` to the `allowedFields` array in the PUT handler of `netlify/functions/proposal-detail.ts`.
3. **Ran the database migration** -- Executed `013_add_revisions_included_to_proposals.sql` against the running database to add the column.

## Key Files

| File | Purpose |
|------|---------|
| `lib/proposals.ts` (root) | Admin app's API client -- talks to Netlify functions |
| `landing-page-new/src/lib/proposals.ts` | Client app's API client -- talks to Next.js API routes |
| `netlify/functions/proposals.ts` | Netlify function for proposal CRUD (used by admin for create) |
| `netlify/functions/proposal-detail.ts` | Netlify function for single proposal operations (used by admin for read/update) |
| `landing-page-new/src/app/api/proposals/route.ts` | Next.js API route (used by client app) |

## Prevention

### Dual API client awareness

This codebase has **two parallel API clients** for proposals:

- `lib/proposals.ts` (root) -- used by the admin app
- `landing-page-new/src/lib/proposals.ts` -- used by the client app

When adding or modifying a field on the `Proposal` type, **both files must be updated**. Always verify which import path a consuming component actually uses before assuming you have edited the correct file.

### Dual Netlify function awareness

There are **two separate Netlify functions** for proposals:

- `netlify/functions/proposals.ts` -- handles create (POST) and list (GET)
- `netlify/functions/proposal-detail.ts` -- handles read (GET), update (PUT), and delete (DELETE) for individual proposals

Each function maintains its own `allowedFields` whitelist independently. Adding a field to one does not affect the other.

### Migration execution checklist

Always run pending migrations against the active database **before** testing database-backed features. A migration file sitting in the repository is not the same as a column existing in the database.

## Lessons Learned

1. **Trace the import chain before editing.** Do not assume which file a component imports from. Open the component, find the `import` statement, and follow it to the actual file. The "obvious" file may not be the one in use.

2. **Allowlists fail silently.** When a Netlify function uses an `allowedFields` whitelist, any field not in the list is silently dropped. There is no error, no warning, and no indication in the API response that data was lost. When adding fields, search for all `allowedFields` arrays across the codebase.

3. **Snake_case/camelCase mapping is bidirectional.** Adding a field requires mapping in both directions: camelCase to snake_case for requests going to the database, and snake_case to camelCase for responses coming back. Missing either direction causes the field to silently disappear at that boundary.

4. **Layer failures incrementally.** This bug involved three independent issues stacked on top of each other. Fixing the first revealed the second; fixing the second revealed the third. When a fix does not resolve the problem, do not assume the original diagnosis was wrong -- there may be multiple failures in sequence.

5. **Search broadly when adding cross-cutting fields.** Use a codebase-wide search for related terms (e.g., `allowedFields`, `proposals`, `snake_case`) to find all locations that need updating, rather than relying on knowledge of the architecture alone.
