# JWT Authentication Strategy

This document defines the authentication strategy for the Motionify Portal. We use a **Hybrid Approach** combining stateless access tokens with stateful refresh tokens for optimal security and performance.

---

## Strategy Overview: Hybrid JWT

**Approach**: Short-lived stateless access tokens + Long-lived stateful refresh tokens

**Why Hybrid?**
- ✅ **Performance**: Access tokens don't require database lookup (fast)
- ✅ **Security**: Refresh tokens can be revoked immediately (secure)
- ✅ **Scalability**: Stateless tokens scale horizontally without session state
- ✅ **Control**: Can revoke sessions, track active devices, "logout all devices"
- ✅ **Industry Standard**: Matches OAuth 2.0 / modern API patterns

---

## Token Types

### 1. Access Token (Stateless)

**Purpose**: Short-lived token for API authentication

**Lifetime**: 15 minutes

**Storage**:
- Client: Memory only (NOT localStorage for security)
- Server: NOT stored in database (stateless)

**Contents** (JWT payload):
```json
{
  "sub": "user-uuid",           // User ID
  "email": "user@example.com",
  "role": "client",
  "type": "access",
  "iat": 1234567890,            // Issued at
  "exp": 1234568790             // Expires (15 min later)
}
```

**Usage**:
```http
GET /api/projects
Authorization: Bearer <access_token>
```

**Validation**:
1. Verify signature (using JWT secret)
2. Check expiration
3. Extract user info from payload
4. **No database lookup** (fast!)

---

### 2. Refresh Token (Stateful)

**Purpose**: Long-lived token to obtain new access tokens

**Lifetime**: 7 days

**Storage**:
- Client: HTTP-only secure cookie (automatic, safe from XSS)
- Server: Hash stored in `sessions` table

**Contents** (JWT payload):
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "jti": "session-uuid",        // JWT ID (maps to session)
  "iat": 1234567890,
  "exp": 1235172690             // Expires (7 days later)
}
```

**Storage in Database**:
```sql
-- sessions table
INSERT INTO sessions (
  id,                   -- Matches JWT 'jti' claim
  user_id,              -- Matches JWT 'sub' claim
  jwt_token_hash,       -- SHA-256 hash of refresh token
  expires_at,           -- Token expiry time
  ip_address,           -- Security tracking
  user_agent,           -- Device identification
  created_at
) VALUES (...);
```

**Validation**:
1. Verify JWT signature and expiration
2. Extract `jti` (session ID) from token
3. Hash the token: `SHA-256(refresh_token)`
4. Query database: Find session with matching ID and hash
5. If found and not expired: Issue new access token
6. If not found: Token was revoked, reject

---

## Authentication Flows

### Login Flow

```
Client                         Server                        Database
  │                              │                               │
  │  POST /api/auth/login        │                               │
  │  { email, password }         │                               │
  ├─────────────────────────────>│                               │
  │                              │  Verify password              │
  │                              │  (bcrypt compare)             │
  │                              │                               │
  │                              │  Generate tokens:             │
  │                              │  - access (15 min)            │
  │                              │  - refresh (7 days)           │
  │                              │                               │
  │                              │  Create session               │
  │                              ├──────────────────────────────>│
  │                              │  INSERT INTO sessions         │
  │                              │  (id=jti, hash=SHA256(token)) │
  │                              │<──────────────────────────────│
  │                              │                               │
  │  200 OK                      │                               │
  │  {                           │                               │
  │    accessToken: "...",       │                               │
  │    user: {...}               │                               │
  │  }                           │                               │
  │  Set-Cookie: refreshToken    │                               │
  │<─────────────────────────────│                               │
  │                              │                               │
```

### API Request Flow (with Access Token)

```
Client                         Server
  │                              │
  │  GET /api/projects           │
  │  Authorization: Bearer <AT>  │
  ├─────────────────────────────>│
  │                              │  Verify JWT signature
  │                              │  Check expiration
  │                              │  Extract user from payload
  │                              │  ✅ NO DATABASE LOOKUP
  │                              │
  │  200 OK                      │
  │  { projects: [...] }         │
  │<─────────────────────────────│
  │                              │
```

### Token Refresh Flow

```
Client                         Server                        Database
  │                              │                               │
  │  POST /api/auth/refresh      │                               │
  │  Cookie: refreshToken=...    │                               │
  ├─────────────────────────────>│                               │
  │                              │  Verify JWT signature         │
  │                              │  Extract jti (session ID)     │
  │                              │  Hash token: SHA256(RT)       │
  │                              │                               │
  │                              │  Find session                 │
  │                              ├──────────────────────────────>│
  │                              │  SELECT * FROM sessions       │
  │                              │  WHERE id = jti               │
  │                              │    AND jwt_token_hash = hash  │
  │                              │    AND expires_at > NOW()     │
  │                              │<──────────────────────────────│
  │                              │                               │
  │                              │  If found:                    │
  │                              │  - Generate new access token  │
  │                              │  - Update last_active_at      │
  │                              │                               │
  │  200 OK                      │                               │
  │  { accessToken: "..." }      │                               │
  │<─────────────────────────────│                               │
  │                              │                               │
```

### Logout Flow

```
Client                         Server                        Database
  │                              │                               │
  │  POST /api/auth/logout       │                               │
  │  Cookie: refreshToken=...    │                               │
  ├─────────────────────────────>│                               │
  │                              │  Extract jti from token       │
  │                              │                               │
  │                              │  Delete session               │
  │                              ├──────────────────────────────>│
  │                              │  DELETE FROM sessions         │
  │                              │  WHERE id = jti               │
  │                              │<──────────────────────────────│
  │                              │                               │
  │  200 OK                      │                               │
  │  Clear-Cookie: refreshToken  │                               │
  │<─────────────────────────────│                               │
  │                              │                               │
  │  Client discards access      │                               │
  │  token from memory           │                               │
  │                              │                               │
```

### Logout All Devices

```
Client                         Server                        Database
  │                              │                               │
  │  POST /api/auth/logout-all   │                               │
  │  Authorization: Bearer <AT>  │                               │
  ├─────────────────────────────>│                               │
  │                              │  Extract user_id from access  │
  │                              │  token payload                │
  │                              │                               │
  │                              │  Delete all user sessions     │
  │                              ├──────────────────────────────>│
  │                              │  DELETE FROM sessions         │
  │                              │  WHERE user_id = :userId      │
  │                              │<──────────────────────────────│
  │                              │                               │
  │  200 OK                      │                               │
  │  { message: "Logged out..." }│                               │
  │<─────────────────────────────│                               │
  │                              │                               │
```

---

## Implementation Details

### Token Generation

```typescript
// server/auth/tokens.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh',
      jti: sessionId
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

### Middleware

```typescript
// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract access token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const accessToken = authHeader.substring(7);

    // Verify token (stateless - no database lookup!)
    const payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Attach user info to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Login Endpoint

```typescript
// server/routes/auth.ts
import { hashToken, generateAccessToken, generateRefreshToken } from '../auth/tokens';

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Verify credentials
  const user = await db.users.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 2. Generate tokens
  const sessionId = randomUUID();
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id, sessionId);

  // 3. Store session in database
  await db.sessions.create({
    data: {
      id: sessionId,
      userId: user.id,
      jwtTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  // 4. Update last login
  await db.users.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // 5. Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // 6. Return access token and user info
  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    }
  });
});
```

### Refresh Endpoint

```typescript
router.post('/auth/refresh', async (req, res) => {
  try {
    // 1. Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // 2. Verify JWT signature and expiration
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // 3. Hash token and find session in database
    const tokenHash = hashToken(refreshToken);
    const session = await db.sessions.findFirst({
      where: {
        id: payload.jti,
        jwtTokenHash: tokenHash,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or revoked session' });
    }

    // 4. Generate new access token
    const accessToken = generateAccessToken(session.user);

    // 5. Update session activity
    await db.sessions.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() }
    });

    // 6. Return new access token
    res.json({ accessToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

---

## Security Considerations

### Token Storage

| Token Type | Client Storage | Server Storage | Why |
|------------|----------------|----------------|-----|
| Access Token | **Memory only** | NOT stored | Prevents XSS attacks, auto-cleared on page refresh |
| Refresh Token | **HTTP-only Cookie** | Hashed in DB | Prevents XSS, allows server revocation |

### Why NOT localStorage?

❌ **Never store tokens in localStorage or sessionStorage**
- Vulnerable to XSS attacks
- Accessible by any JavaScript (including malicious scripts)
- Can't set httpOnly flag

✅ **Use memory for access tokens**
- Cleared on page refresh (user must refresh)
- Not accessible to XSS scripts

✅ **Use HTTP-only cookies for refresh tokens**
- Browser automatically sends with requests
- Not accessible via JavaScript
- Can be set with Secure and SameSite flags

### Token Rotation

When refresh token is used, you can optionally rotate it:

```typescript
// Optional: Rotate refresh token on use
const newSessionId = randomUUID();
const newRefreshToken = generateRefreshToken(user.id, newSessionId);

// Delete old session
await db.sessions.delete({ where: { id: payload.jti } });

// Create new session
await db.sessions.create({
  data: {
    id: newSessionId,
    userId: user.id,
    jwtTokenHash: hashToken(newRefreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});

// Return new tokens
res.cookie('refreshToken', newRefreshToken, {...});
res.json({ accessToken: generateAccessToken(user) });
```

**Trade-off**: More secure but requires frontend to handle cookie updates

---

## Session Management Features

### List Active Sessions

```sql
-- Get all active sessions for a user
SELECT
  id,
  ip_address,
  user_agent,
  created_at,
  last_active_at,
  expires_at
FROM sessions
WHERE user_id = :userId
  AND expires_at > CURRENT_TIMESTAMP
ORDER BY last_active_at DESC;
```

### Revoke Specific Session

```sql
-- Revoke a specific session (logout from device)
DELETE FROM sessions
WHERE id = :sessionId
  AND user_id = :userId;
```

### Security Audit

```sql
-- Find suspicious sessions
SELECT
  s.id,
  s.user_id,
  s.ip_address,
  s.created_at,
  COUNT(*) OVER (PARTITION BY s.user_id, DATE(s.created_at)) as logins_today
FROM sessions s
WHERE s.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
HAVING logins_today > 10;  -- Multiple logins from same user
```

---

## Client Implementation (React)

```typescript
// client/auth/useAuth.tsx
import { useState, useEffect } from 'react';

let accessToken: string | null = null;  // Memory storage

export function useAuth() {
  const [user, setUser] = useState(null);

  // Login
  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'  // Include cookies
    });

    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    accessToken = data.accessToken;  // Store in memory
    setUser(data.user);
  }

  // Make authenticated request
  async function authFetch(url: string, options = {}) {
    // If no access token, try to refresh
    if (!accessToken) {
      await refreshAccessToken();
    }

    let res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // If 401 and token expired, refresh and retry
    if (res.status === 401) {
      const error = await res.json();
      if (error.code === 'TOKEN_EXPIRED') {
        await refreshAccessToken();

        // Retry request with new token
        res = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    }

    return res;
  }

  // Refresh access token using refresh token cookie
  async function refreshAccessToken() {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'  // Send refresh token cookie
    });

    if (!res.ok) {
      // Refresh token expired or invalid - logout
      accessToken = null;
      setUser(null);
      throw new Error('Session expired');
    }

    const data = await res.json();
    accessToken = data.accessToken;
  }

  // Logout
  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    accessToken = null;
    setUser(null);
  }

  return { user, login, logout, authFetch };
}
```

---

## Environment Variables

```bash
# .env
JWT_ACCESS_SECRET=<random-256-bit-string>   # For access tokens
JWT_REFRESH_SECRET=<random-256-bit-string>  # For refresh tokens (different!)
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Comparison with Alternatives

| Approach | Performance | Security | Scalability | Session Control |
|----------|-------------|----------|-------------|-----------------|
| **Session Cookies (Old)** | Slow (DB lookup) | Good | Poor (sticky sessions) | Excellent |
| **Stateless JWT Only** | Fast | Poor (can't revoke) | Excellent | None |
| **Hybrid (Our Choice)** | Fast | Excellent | Excellent | Excellent |

---

## FAQ

**Q: Why not use only stateless JWT?**
A: Can't revoke tokens. If stolen, attacker has access until expiry.

**Q: Why not use only sessions?**
A: Every request hits database. Poor performance at scale.

**Q: What if access token is stolen?**
A: Limited damage - only valid for 15 minutes. Can't be used to get new tokens.

**Q: What if refresh token is stolen?**
A: Revoke the session in database. Token becomes invalid immediately.

**Q: Why hash refresh tokens in database?**
A: If database is compromised, attacker can't use the tokens (similar to password hashing).

**Q: Should I rotate refresh tokens?**
A: Optional. Adds security but complexity. Good for high-security apps.

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**Status**: Production Ready
