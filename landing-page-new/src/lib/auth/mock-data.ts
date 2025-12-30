import { User, Session } from './types';

export const MOCK_USERS: Record<string, User> = {
    'john.doe@acmecorp.com': {
        id: 'usr_123456',
        email: 'john.doe@acmecorp.com',
        name: 'John Doe',
        role: 'client',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        createdAt: '2025-01-15T10:00:00Z',
        lastLoginAt: new Date().toISOString(),
        preferences: {
            emailNotifications: true,
            mentionNotifications: true,
            approvalNotifications: true,
            dailyDigest: false,
        },
    },
    'jane.admin@motionify.studio': {
        id: 'usr_admin789',
        email: 'jane.admin@motionify.studio',
        name: 'Jane Admin',
        role: 'admin',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
        createdAt: '2024-11-01T09:00:00Z',
        lastLoginAt: new Date().toISOString(),
        preferences: {
            emailNotifications: true,
            mentionNotifications: true,
            approvalNotifications: true,
            dailyDigest: true,
        },
    }
};

export const MOCK_SESSIONS: Record<string, Session> = {};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
