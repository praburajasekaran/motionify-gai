# Phase 1: Authentication & Security

**Status:** Planned (Ready for Execution)
**Priority:** Critical
**Estimated Total Effort:** 6-7 hours

---

## Overview

Replace mock authentication with production-ready auth system and fix critical security vulnerabilities identified in CONCERNS.md.

---

## Sub-Plans

### PROD-01-01: Remove Mock Authentication ⚡ (30 min)
**Status:** Ready
**Priority:** Critical
**Goal:** Eliminate development-only mock authentication code

**Key Tasks:**
- Remove MOCK_USERS and setMockUser from lib/auth.ts
- Update AuthContext files to remove mock imports
- Search and remove all mock auth usage
- Update development workflow documentation

**Why First:** Must remove mock auth before implementing real auth

---

### PROD-01-02: Implement JWT Sessions with httpOnly Cookies 🔐 (2 hours)
**Status:** Ready
**Priority:** Critical
**Goal:** Replace localStorage tokens with secure httpOnly cookies

**Key Tasks:**
- Create JWT generation/verification utilities
- Create auth middleware (requireAuth, requireSuperAdmin)
- Update magic link verification to set httpOnly cookie
- Create /auth/me and /auth/logout endpoints
- Update frontend to use credentials: 'include'
- Update AuthContext to read from cookies

**Why Second:** Core auth infrastructure needed before applying middleware

---

### PROD-01-03: Apply Security Middleware to All Endpoints 🛡️ (3-4 hours)
**Status:** Ready
**Priority:** High
**Goal:** Apply auth, rate limiting, and input validation to all 60+ endpoints

**Key Tasks:**
- Create middleware composition utility
- Audit all 60+ API endpoints
- Define Zod schemas for all entities
- Apply middleware to high-priority endpoints (user mgmt, proposals)
- Apply middleware to remaining endpoints
- Test rate limiting, auth, and validation

**Why Third:** Requires auth middleware from PROD-01-02

---

### PROD-01-04: Enforce SSL in Production 🔒 (30 min)
**Status:** Ready
**Priority:** Medium
**Goal:** Remove SSL bypass options, enforce strict certificate validation

**Key Tasks:**
- Update _shared/db.ts to remove DISABLE_SSL_VALIDATION
- Update environment variable documentation
- Check all database connection files
- Verify database provider SSL support
- Test production connectivity

**Why Last:** Independent task, can run in parallel with others

---

## Execution Order

**Recommended:**
1. PROD-01-01 (blocks PROD-01-02)
2. PROD-01-02 (blocks PROD-01-03)
3. PROD-01-03 + PROD-01-04 (can run in parallel)

**Alternative (Parallel):**
- PROD-01-01 → PROD-01-02 (sequential, main path)
- PROD-01-04 (parallel, independent)
- PROD-01-03 (after PROD-01-02 complete)

---

## Success Criteria

By the end of Phase 1, the following must be true:

**Security:**
- [ ] No mock authentication code in production
- [ ] All sessions use httpOnly cookies (not localStorage)
- [ ] All admin endpoints verify Super Admin role
- [ ] All endpoints have rate limiting
- [ ] All POST/PUT/PATCH endpoints validate input
- [ ] Database connections use SSL with certificate validation

**Functionality:**
- [ ] Magic link login works end-to-end
- [ ] JWT tokens have proper expiration (24h default, 7d rememberMe)
- [ ] Logout clears cookie
- [ ] Unauthorized requests return 401/403
- [ ] Invalid input returns 400 with clear errors
- [ ] Rate limiting prevents abuse (>100 req/min blocked)

**Quality:**
- [ ] Admin and client portals build successfully
- [ ] No console errors in browser
- [ ] CORS configured correctly for cookies
- [ ] All endpoints tested and working

---

## Files Created

**Planning:**
- `.planning/phases/PROD-01-authentication-security/RESEARCH.md` ✅
- `.planning/phases/PROD-01-authentication-security/PROD-01-01-PLAN.md` ✅
- `.planning/phases/PROD-01-authentication-security/PROD-01-02-PLAN.md` ✅
- `.planning/phases/PROD-01-authentication-security/PROD-01-03-PLAN.md` ✅
- `.planning/phases/PROD-01-authentication-security/PROD-01-04-PLAN.md` ✅
- `.planning/phases/PROD-01-authentication-security/README.md` ✅

**Will Create During Execution:**
- `netlify/functions/_shared/jwt.ts` (JWT utilities)
- `netlify/functions/_shared/auth.ts` (Auth middleware)
- `netlify/functions/_shared/middleware.ts` (Middleware composition)
- `netlify/functions/_shared/schemas.ts` (Zod schemas)
- `netlify/functions/auth-me.ts` (Get current user)
- `netlify/functions/auth-logout.ts` (Clear cookie)
- `netlify/functions/health-check.ts` (Optional: DB health check)

---

## Testing Strategy

### Unit Tests
- JWT generation and verification
- Middleware composition
- Rate limit calculations
- Input validation schemas

### Integration Tests
1. **Auth Flow:** Request magic link → receive email → click link → JWT cookie set → access protected endpoints
2. **Role Authorization:** Super Admin can access admin endpoints, others cannot
3. **Rate Limiting:** Exceed limit → 429 response
4. **Input Validation:** Invalid input → 400 with error messages

### Manual UAT
1. Login from both portals
2. Cookie persistence across refreshes
3. Logout clears cookie
4. Invalid/expired token → redirect to login
5. Admin-only endpoints reject non-admin

---

## Risks & Mitigations

**Risk:** Cookie-based auth breaks due to CORS
**Mitigation:** Both portals must be on same domain/subdomain. Test credentials: 'include' early.

**Risk:** SSL enforcement breaks production database connectivity
**Mitigation:** Verify database provider SSL support before deploying. Have rollback plan ready.

**Risk:** Middleware breaks existing endpoints
**Mitigation:** Apply incrementally (high-priority first). Test each endpoint after adding middleware.

**Risk:** Rate limiting too aggressive, blocks legitimate users
**Mitigation:** Start with generous limits (100/min). Monitor and adjust based on usage patterns.

---

## Environment Variables Required

```bash
# Required for PROD-01-02
JWT_SECRET=<generate-with-openssl-rand-base64-32>

# Optional for PROD-01-04 (development/staging only)
DATABASE_SSL=true  # Default: true
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

---

## Next Steps

1. **Review plans:** Ensure all stakeholders understand the changes
2. **Set up environment variables:** Add JWT_SECRET to production environment
3. **Execute PROD-01-01:** Remove mock auth (30 min)
4. **Execute PROD-01-02:** Implement JWT sessions (2 hours)
5. **Execute PROD-01-03:** Apply middleware (3-4 hours)
6. **Execute PROD-01-04:** Enforce SSL (30 min)
7. **UAT Testing:** Verify all success criteria met
8. **Mark Phase 1 complete:** Update PRODUCTION_ROADMAP.md

---

## Links

- [Production Roadmap](../../PRODUCTION_ROADMAP.md)
- [CONCERNS.md](../../codebase/CONCERNS.md) - Original security gaps identified
- [Research Document](./RESEARCH.md) - Detailed implementation research

---

*Phase 1 planning complete - ready for /gsd:execute-phase*
*Created: 2026-01-24*
