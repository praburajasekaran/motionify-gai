// Authentication-specific type definitions
// Based on /features/authentication-system/03-data-models.md

export type UserRole =
    | 'client'              // Customer who owns projects
    | 'project_manager'     // Motionify project manager
    | 'admin'               // Admin with limited permissions
    | 'super_admin';        // Full admin access

export type UserStatus =
    | 'pending_activation'  // User created but hasn't logged in yet
    | 'active'              // User is active and can log in
    | 'deactivated';        // User account disabled by admin

export type AuthEvent =
    // Magic Link Events
    | 'magic_link_requested'
    | 'magic_link_sent'
    | 'magic_link_send_failed'
    | 'magic_link_clicked'
    | 'magic_link_verified'
    | 'magic_link_expired'
    | 'magic_link_already_used'
    | 'magic_link_invalid'
    // Session Events
    | 'login_success'
    | 'login_failure'
    | 'logout'
    | 'session_created'
    | 'session_refreshed'
    | 'session_expired'
    | 'session_invalidated'
    // Rate Limit Events
    | 'rate_limit_email'
    | 'rate_limit_ip'
    // Security Events
    | 'jwt_invalid'
    | 'jwt_expired'
    | 'jwt_tampered'
    | 'suspicious_activity';

export interface UserPreferences {
    emailNotifications: boolean;
    mentionNotifications: boolean;
    approvalNotifications: boolean;
}

export interface AuthUser {
    // Core Identification
    id: string;                          // UUID
    email: string;                       // Unique email address
    fullName: string;                    // User's full name
    role: UserRole;

    // Profile
    avatarUrl: string | null;            // Profile photo URL (Cloudflare R2)
    preferences: UserPreferences;        // User notification settings

    // Account Status
    status: UserStatus;
    isFirstLogin: boolean;               // Whether this is user's first login

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    deactivatedAt: Date | null;

    // Metadata
    metadata: Record<string, any>;
}

export interface MagicLinkToken {
    // Core Identification
    id: string;                          // UUID
    userId: string;                      // UUID - User this token is for
    token: string;                       // Cryptographically secure token (32 bytes, base64-url)

    // Expiry & Usage
    expiresAt: Date;                     // Expiry timestamp (15 minutes from creation)
    usedAt: Date | null;                 // When token was used (null if unused)
    rememberMe: boolean;                 // Whether to create long-lived session (30 days vs 24 hours)

    // Security
    ipAddress: string | null;
    userAgent: string | null;

    // Timestamps
    createdAt: Date;
}

export interface Session {
    // Core Identification
    id: string;                          // UUID
    userId: string;                      // UUID - User this session belongs to
    jwtToken: string;                    // JWT token value (hashed in database)

    // Session Configuration
    expiresAt: Date;                     // Session expiry (30 days or 24 hours)
    lastActiveAt: Date;                  // Last API request timestamp
    rememberMe: boolean;                 // Whether this is a long-lived session

    // Device Information
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string | null;

    // Timestamps
    createdAt: Date;
    invalidatedAt: Date | null;
}

export interface JWTPayload {
    // User Information
    userId: string;                      // UUID
    email: string;
    role: UserRole;
    fullName: string;

    // Token Metadata
    sessionId: string;                   // UUID - Associated session
    iat: number;                         // Issued at (Unix timestamp)
    exp: number;                         // Expiration (Unix timestamp)

    // Optional
    rememberMe?: boolean;
}

export interface ActivityLog {
    // Core Identification
    id: string;                          // UUID
    userId: string | null;               // UUID - User involved (null for failed attempts)

    // Event Details
    event: AuthEvent;
    description: string;
    status: 'success' | 'failure';

    // Context
    ipAddress: string;
    userAgent: string;
    metadata: Record<string, any>;

    // Timestamp
    createdAt: Date;
}

// API Request/Response Types
export interface MagicLinkRequestBody {
    email: string;
    rememberMe?: boolean;
}

export interface MagicLinkRequestResponse {
    success: boolean;
    message: string;
}

export interface MagicLinkVerifyResponse {
    success: boolean;
    data: {
        user: AuthUser;
        token: string;
        expiresAt: string;
        inquiryCreated?: boolean;
        inquiryId?: string;
        inquiryNumber?: string;
    };
    message: string;
}

export interface AuthErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        field?: string;
        details?: Record<string, any>;
    };
}

export interface UpdateProfileData {
    fullName?: string;
    avatarUrl?: string;
    preferences?: UserPreferences;
}

export interface UserProfileResponse {
    success: boolean;
    data: {
        user: AuthUser;
        session: {
            expiresAt: string;
            lastActiveAt: string;
            rememberMe: boolean;
        };
    };
}

// Constants
export const AUTH_CONFIG = {
    // Magic Link Settings
    MAGIC_LINK_EXPIRY_MINUTES: 15,
    MAGIC_LINK_TOKEN_BYTES: 32,

    // Session Settings
    SESSION_DURATION_SHORT: 24 * 60 * 60, // 24 hours in seconds
    SESSION_DURATION_LONG: 30 * 24 * 60 * 60, // 30 days in seconds

    // Rate Limiting
    RATE_LIMIT_EMAIL_MAX: 3,
    RATE_LIMIT_EMAIL_WINDOW: 60 * 60,     // 1 hour in seconds
    RATE_LIMIT_IP_MAX: 10,
    RATE_LIMIT_IP_WINDOW: 60 * 60,

    // JWT Settings
    JWT_ALGORITHM: 'HS256' as const,
    JWT_ISSUER: 'motionify-portal',

    // Security
    BCRYPT_ROUNDS: 10,
    MAX_AVATAR_SIZE: 5 * 1024 * 1024,     // 5MB
} as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    client: 'Client',
    project_manager: 'Project Manager',
    admin: 'Admin',
    super_admin: 'Super Admin',
} as const;

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    deactivated: 'Deactivated',
} as const;
