/**
 * Authentication Context
 *
 * Provides current user information and authentication state to all components.
 * Replaces mock user data with real authentication context.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual authentication logic
    // This should:
    // 1. Check for JWT token in localStorage or cookies
    // 2. Validate the token with the backend
    // 3. Fetch user profile information
    // 4. Set the user state

    // For now, simulate loading
    const loadUser = async () => {
      try {
        // Simulated user loading
        // In production, this would be:
        // const response = await fetch('/api/auth/me');
        // const userData = await response.json();
        // setUser(userData);

        // For development: Check if there's a mock user in localStorage
        const mockUserStr = localStorage.getItem('mockUser');
        if (mockUserStr) {
          const mockUser = JSON.parse(mockUserStr);
          setUser(mockUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = () => {
    // TODO: Replace with actual logout logic
    // This should:
    // 1. Invalidate the JWT token on the backend
    // 2. Clear localStorage/cookies
    // 3. Redirect to login page

    setUser(null);
    localStorage.removeItem('mockUser');
    // window.location.href = '/login';
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    setUser,
    logout,
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

/**
 * Development helper: Set a mock user for testing
 * This should only be used in development/testing
 */
export function setMockUser(user: User) {
  localStorage.setItem('mockUser', JSON.stringify(user));
  window.location.reload();
}

/**
 * Development helper: Create mock users for testing different roles
 */
export const MOCK_USERS: Record<string, User> = {
  superAdmin: {
    id: 'user-1',
    name: 'Super Admin',
    email: 'admin@motionify.studio',
    role: 'super_admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    projectTeamMemberships: {},
  },
  motionifySupport: {
    id: 'user-2',
    name: 'John Support',
    email: 'john@motionify.studio',
    role: 'project_manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    projectTeamMemberships: {},
  },
  teamMember: {
    id: 'user-3',
    name: 'Sarah Designer',
    email: 'sarah@motionify.studio',
    role: 'team_member',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    projectTeamMemberships: {},
  },
  clientPrimary: {
    id: 'user-4',
    name: 'Alex Client',
    email: 'alex@acmecorp.com',
    role: 'client',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    projectTeamMemberships: {
      'project-1': {
        projectId: 'project-1',
        isPrimaryContact: true,
        joinedAt: '2025-01-01',
      },
    },
  },
  clientTeam: {
    id: 'user-5',
    name: 'Bob Viewer',
    email: 'bob@acmecorp.com',
    role: 'client',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    projectTeamMemberships: {
      'project-1': {
        projectId: 'project-1',
        isPrimaryContact: false,
        joinedAt: '2025-01-01',
      },
    },
  },
};
