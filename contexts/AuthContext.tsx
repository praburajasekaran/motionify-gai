/**
 * Authentication Context
 *
 * Provides current user information and authentication state to all components.
 * Integrates with real backend authentication via httpOnly cookies.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { clearAuthSession } from '@/lib/auth';
import { API_BASE } from '@/lib/api-config';
import { setUserTimezone } from '@/utils/dateFormatting';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    token: string | null;
    setUser: (user: User | null) => void;
    logout: () => void;
    refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUserState] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Load user from cookie-based session via /auth-me endpoint
     */
    const loadUser = useCallback(async () => {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            const response = await fetch(`${API_BASE}/auth-me`, {
                method: 'GET',
                credentials: 'include',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    setUserState(data.user);
                    setUserTimezone(data.user.timezone || null);
                    setToken('cookie'); // Indicate we have a valid session
                    return;
                }
            }

            // No valid session
            setToken(null);
            setUserState(null);
            setUserTimezone(null);
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('Auth check timed out - API server may not be running');
            } else {
                console.error('Failed to load user session:', error);
            }
            setToken(null);
            setUserState(null);
            setUserTimezone(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Set user and update session
     */
    const setUser = useCallback((newUser: User | null) => {
        if (newUser) {
            setUserState(newUser);
            setToken('cookie'); // Indicate we have a valid session
        } else {
            clearAuthSession();
            setToken(null);
            setUserState(null);
        }
    }, []);

    /**
     * Logout and clear session
     */
    const logout = useCallback(async () => {
        try {
            // Call /auth-logout to clear the httpOnly cookie
            await fetch(`${API_BASE}/auth-logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }
        // Clean up any legacy localStorage data
        clearAuthSession();
        setToken(null);
        setUserState(null);
        setUserTimezone(null);
        // Redirect to login page
        window.location.href = '/portal/login';
    }, []);

    /**
     * Refresh session - check if still valid via /auth-me endpoint
     */
    const refreshSession = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/auth-me`, {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    setUserState(data.user);
                    setUserTimezone(data.user.timezone || null);
                    setToken('cookie');
                    return;
                }
            }

            // Session expired or invalid
            setToken(null);
            setUserState(null);
            setUserTimezone(null);
        } catch (error) {
            console.error('Failed to refresh session:', error);
            // Don't clear session on network errors - keep current state
        }
    }, []);

    // Load user on mount
    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // Periodic session check
    useEffect(() => {
        const interval = setInterval(() => {
            refreshSession();
        }, SESSION_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [refreshSession]);

    // Multi-tab support: Listen for visibility changes to refresh session when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshSession();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [refreshSession]);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: user !== null && token !== null,
        token,
        setUser,
        logout,
        refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 */
export function useAuthContext(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
