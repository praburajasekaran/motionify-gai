/**
 * Authentication Context
 *
 * Provides current user information and authentication state to all components.
 * Integrates with real backend authentication via JWT tokens.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import {
    getStoredUser,
    getAuthToken,
    clearAuthSession,
    storeAuthSession,
} from '@/lib/auth';

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
     * Load user from stored session
     */
    const loadUser = useCallback(() => {
        try {
            const storedToken = getAuthToken();
            const storedUser = getStoredUser();

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUserState(storedUser);
            } else {
                setToken(null);
                setUserState(null);
            }
        } catch (error) {
            console.error('Failed to load user session:', error);
            clearAuthSession();
            setToken(null);
            setUserState(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Set user and update session
     */
    const setUser = useCallback((newUser: User | null) => {
        if (newUser) {
            // If setting a new user without going through login,
            // we need a token - this is for mock mode
            const currentToken = getAuthToken();
            if (currentToken) {
                setUserState(newUser);
            }
        } else {
            clearAuthSession();
            setToken(null);
            setUserState(null);
        }
    }, []);

    /**
     * Logout and clear session
     */
    const logout = useCallback(() => {
        clearAuthSession();
        setToken(null);
        setUserState(null);
        // Redirect to login page
        window.location.href = '/#/login';
    }, []);

    /**
     * Refresh session - check if still valid
     */
    const refreshSession = useCallback(() => {
        const currentToken = getAuthToken();
        if (!currentToken) {
            // Session expired
            setToken(null);
            setUserState(null);
        } else {
            // Update user from storage in case it changed
            const storedUser = getStoredUser();
            if (storedUser) {
                setUserState(storedUser);
            }
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

    // Listen for storage changes (for multi-tab support)
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'auth_token' || event.key === 'auth_user') {
                refreshSession();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
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
