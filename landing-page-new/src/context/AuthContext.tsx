"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/lib/portal/types/auth.types';
import * as authApi from '@/lib/portal/api/auth.api';

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, rememberMe?: boolean) => Promise<void>;
    verifyToken: (token: string, email: string) => Promise<{ success: boolean; data?: any }>;
    logout: () => Promise<void>;
    updateProfile: (data: { fullName?: string; avatarUrl?: string; preferences?: any }) => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            if (user) {
                console.log('[AuthContext] User already set, skipping getCurrentUser call');
                setIsLoading(false);
                return;
            }

            const savedUser = localStorage.getItem('portal_user');
            if (savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    console.log('[AuthContext] Loading user from localStorage:', parsedUser);
                    setUser(parsedUser);
                } catch (error) {
                    console.error('[AuthContext] Failed to parse saved user:', error);
                    localStorage.removeItem('portal_user');
                }
                setIsLoading(false);
                return;
            }

            const hasCookie = typeof document !== 'undefined' && document.cookie.includes('sb-session=');
            if (!hasCookie) {
                console.log('[AuthContext] No session cookie found, skipping auth check');
                setIsLoading(false);
                return;
            }

            console.log('[AuthContext] Session cookie found, loading user from API');
            try {
                const response = await authApi.getCurrentUser();
                if (response.success && 'data' in response) {
                    setUser(response.data.user);
                }
            } catch (error) {
                console.error('Failed to load user:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Auto-refresh session every 15 minutes
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(async () => {
            try {
                await authApi.refreshSession();
            } catch (error) {
                console.error('Failed to refresh session:', error);
            }
        }, 15 * 60 * 1000); // 15 minutes

        return () => clearInterval(interval);
    }, [user]);

    const login = useCallback(async (email: string, rememberMe: boolean = false) => {
        setIsLoading(true);
        try {
            await authApi.requestMagicLink({ email, rememberMe });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const verifyToken = useCallback(async (token: string, email: string): Promise<{ success: boolean; data?: any }> => {
        console.log('[AuthContext] verifyToken called');
        try {
            const response = await authApi.verifyMagicLinkWithEmail(token, email);

            if (response.success && 'data' in response) {
                console.log('[AuthContext] Token valid, setting user:', response.data.user);
                // OPTIMIZATION: Set user AND immediately clear loading state
                // This allows the portal to render faster
                setUser(response.data.user);
                setIsLoading(false);
                return { success: true, data: response.data };
            }

            console.log('[AuthContext] Token invalid');
            setIsLoading(false);
            return { success: false };
        } catch (error) {
            console.error('[AuthContext] Token verification failed:', error);
            setIsLoading(false);
            return { success: false };
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            localStorage.removeItem('portal_user');
            document.cookie = 'sb-session=; path=/; max-age=0';
            await authApi.logout();
        } catch (error) {
            console.error('[AuthContext] Logout error:', error);
        } finally {
            setUser(null);
            router.replace('/login');
            setIsLoading(false);
        }
    }, [router]);

    const updateProfile = useCallback(async (data: { fullName?: string; avatarUrl?: string; preferences?: any }) => {
        setIsLoading(true);
        try {
            const response = await authApi.updateProfile(data);

            if (response.success && user) {
                setUser({
                    ...user,
                    ...data,
                    updatedAt: new Date(),
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const refreshSession = useCallback(async () => {
        await authApi.refreshSession();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            verifyToken,
            logout,
            updateProfile,
            refreshSession
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
