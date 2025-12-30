export type UserRole = 'admin' | 'client' | 'editor' | 'viewer';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string;
    createdAt: string;
    lastLoginAt: string;
    preferences: {
        emailNotifications: boolean;
        mentionNotifications: boolean;
        approvalNotifications: boolean;
        dailyDigest: boolean;
    };
}

export interface Session {
    token: string;
    user: User;
    expiresAt: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string) => Promise<void>;
    verifyToken: (token: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
}
