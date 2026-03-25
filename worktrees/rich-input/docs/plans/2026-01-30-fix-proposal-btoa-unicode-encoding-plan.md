---
title: "Fix btoa Unicode Encoding Error in ProposalBuilder"
type: fix
date: 2026-01-30
---

# Fix: btoa Unicode Encoding Error in ProposalBuilder

## Overview

`btoa()` crashes when proposal or inquiry data contains characters outside the Latin1 range (code points > 255). This breaks proposal link generation for any user who enters Unicode characters — accented names, non-English company names, emoji in descriptions, etc.

## Problem Statement

**Error:**
```
InvalidCharacterError: Failed to execute 'btoa' on 'Window':
The string to be encoded contains characters outside of the Latin1 range.
    at handleSaveProposal (ProposalBuilder.tsx:235:27)
```

**Root cause:** `btoa()` only accepts Latin1 characters (0x00–0xFF). The app encodes full proposal + inquiry JSON into a URL parameter using `btoa(JSON.stringify(proposalData))`. Any Unicode character in user-input fields (contact name, company name, description, deliverable names) triggers this error.

**Why btoa exists here:** The admin portal (Vite, port 5173) and client portal (Next.js, port 5174) are separate origins. localStorage is port-scoped, so proposal data is passed via Base64-encoded URL parameters. See `TEST_PROPOSAL_LINK.md` for context.

## Proposed Solution

Replace raw `btoa()`/`atob()` with a Unicode-safe encoding utility using the standard `encodeURIComponent` + `btoa` pattern.

**Encode (Unicode-safe):**
```typescript
function encodeBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
}
```

**Decode (Unicode-safe):**
```typescript
function decodeBase64(str: string): string {
  return decodeURIComponent(
    atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
}
```

This is the [MDN-recommended pattern](https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem) for Unicode Base64 encoding in browsers.

## Acceptance Criteria

- [x] Proposal links generate without error when data contains Unicode characters (accented names, CJK, emoji)
- [x] Existing ASCII-only proposal links continue to work (backwards compatible)
- [x] Client portal correctly decodes Unicode proposal links
- [x] Both encode sites (ProposalBuilder, InquiryDetail) use the shared utility
- [x] Decode site (proposal/[proposalId]/page.tsx) uses the matching decode utility

## Files to Change

### Encoding side (admin portal)

1. **`pages/admin/ProposalBuilder.tsx:235`** — Replace `btoa(JSON.stringify(proposalData))` with `encodeBase64(JSON.stringify(proposalData))`
2. **`pages/admin/InquiryDetail.tsx:122`** — Same replacement

### Decoding side (client portal)

3. **`landing-page-new/src/app/proposal/[proposalId]/page.tsx:32`** — Replace `JSON.parse(atob(encodedData))` with `JSON.parse(decodeBase64(encodedData))`

### Shared utility (new)

4. **`utils/encoding.ts`** — Create `encodeBase64` and `decodeBase64` functions
5. **`landing-page-new/src/lib/encoding.ts`** — Duplicate utility for the Next.js app (separate build)

## MVP

### utils/encoding.ts

```typescript
/**
 * Unicode-safe Base64 encoding/decoding.
 * Standard btoa/atob only handles Latin1. These wrappers
 * handle full Unicode via the encodeURIComponent bridge.
 */

export function encodeBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

export function decodeBase64(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}
```

### ProposalBuilder.tsx (line ~235)

```typescript
import { encodeBase64 } from '../../utils/encoding';

// Replace:
// const encodedData = btoa(JSON.stringify(proposalData));
const encodedData = encodeBase64(JSON.stringify(proposalData));
```

### InquiryDetail.tsx (line ~122)

```typescript
import { encodeBase64 } from '../../utils/encoding';

// Replace:
// const encodedData = btoa(JSON.stringify(proposalData));
const encodedData = encodeBase64(JSON.stringify(proposalData));
```

### proposal/[proposalId]/page.tsx (line ~32)

```typescript
import { decodeBase64 } from '@/lib/encoding';

// Replace:
// const decodedData = JSON.parse(atob(encodedData));
const decodedData = JSON.parse(decodeBase64(encodedData));
```

## Note on the Vite WebSocket Warning

The `[vite] failed to connect to websocket` message is a separate, non-blocking issue. It's a known Vite HMR warning when the dev server's WebSocket connection drops. It does not affect the btoa bug and can be addressed independently by configuring `server.hmr` in `vite.config.ts` if needed.

## References

- MDN: [The Unicode Problem with Base64](https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem)
- `TEST_PROPOSAL_LINK.md` — Documents why btoa URL encoding was introduced
- `docs/solutions/integration-issues/revisions-included-field-not-persisting.md` — Documents dual API client pattern (both portals must be updated)
