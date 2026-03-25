/**
 * Authentication Context
 *
 * Provides current user information and authentication state to all components.
 * Internally uses React Query via useAuth() hook for caching and background refresh.
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';
import { clearAuthSession } from '@/lib/auth';
import { API_BASE } from '@/lib/api-config';
import { setUserTimezone } from '@/utils/dateFormatting';
import { useAuth, authKeys } from '@/shared/hooks/useAuth';

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

export function AuthProvider({ children }: AuthProviderProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: user, isLoading } = useAuth();

    /**
     * Set user — updates the React Query cache directly
     */
    const setUser = useCallback((newUser: User | null) => {
        if (newUser) {
            queryClient.setQueryData(authKeys.session(), newUser);
            setUserTimezone(newUser.timezone || null);
        } else {
            clearAuthSession();
            queryClient.setQueryData(authKeys.session(), null);
            setUserTimezone(null);
        }
    }, [queryClient]);

    /**
     * Logout and clear session
     */
    const logout = useCallback(async () => {
        try {
            await fetch(`${API_BASE}/auth-logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }
        clearAuthSession();
        queryClient.setQueryData(authKeys.session(), null);
        setUserTimezone(null);
        navigate('/login', { replace: true });
    }, [queryClient, navigate]);

    /**
     * Refresh session — invalidates the React Query cache, triggering a re-fetch
     */
    const refreshSession = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: authKeys.session() });
    }, [queryClient]);

    const value: AuthContextType = {
        user: user ?? null,
        isLoading,
        isAuthenticated: user != null,
        token: user != null ? 'cookie' : null,
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
