'use client';

/**
 * Notification Context for Client Portal
 *
 * Provides in-app notification state and management functions.
 * Fetches real notifications from the database via API.
 * Adapted from admin portal NotificationContext for Next.js client portal.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

// Notification types matching the existing pattern
export type NotificationType =
    | 'task_assigned'
    | 'task_status_changed'
    | 'comment_mention'
    | 'comment_created'
    | 'file_uploaded'
    | 'approval_request'
    | 'revision_requested'
    | 'payment_received'
    | 'team_member_added'
    | 'project_status_changed';

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    'task_assigned': '🎯',
    'task_status_changed': '✅',
    'comment_mention': '💬',
    'comment_created': '💬',
    'file_uploaded': '📁',
    'approval_request': '👍',
    'revision_requested': '🔄',
    'payment_received': '💰',
    'team_member_added': '👥',
    'project_status_changed': '📂',
};

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    actionUrl?: string;
    actorName?: string;
    projectId?: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: ReactNode;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/.netlify/functions';

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read).length,
        [notifications]
    );

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        if (!user?.id) {
            setNotifications([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/notifications?userId=${user.id}`, {
                credentials: 'include',
            });

            // Check if response is OK and is JSON before parsing
            if (!response.ok) {
                // Silently handle 404 - notifications API may not be available
                if (response.status === 404) {
                    return;
                }
                console.warn(`Notifications API returned status ${response.status}`);
                return;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                // Silently handle non-JSON responses (e.g., HTML error pages)
                return;
            }

            const data = await response.json();

            if (data.success && data.notifications) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            // Only log in development, silently handle in production
            if (process.env.NODE_ENV === 'development') {
                console.warn('Notifications not available:', error instanceof Error ? error.message : error);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    // Fetch on mount and when user changes
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        if (!user?.id) return;

        const POLL_INTERVAL = 30000; // 30 seconds
        let intervalId: ReturnType<typeof setInterval> | undefined;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (!intervalId) {
                    fetchNotifications();
                    intervalId = setInterval(fetchNotifications, POLL_INTERVAL);
                }
            } else {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = undefined;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start polling
        intervalId = setInterval(fetchNotifications, POLL_INTERVAL);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [user?.id, fetchNotifications]);

    const markAsRead = useCallback(async (id: string) => {
        if (!user?.id) return;

        // Optimistic update
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );

        try {
            await fetch(`${API_BASE}/notifications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id, notificationId: id }),
            });
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // Revert on error
            fetchNotifications();
        }
    }, [user?.id, fetchNotifications]);

    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        try {
            await fetch(`${API_BASE}/notifications?markAll=true`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id }),
            });
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            // Revert on error
            fetchNotifications();
        }
    }, [user?.id, fetchNotifications]);

    const addNotification = useCallback(
        (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
            // Add to local state for immediate feedback
            // Real-time updates would come from polling or WebSocket in production
            const newNotification: AppNotification = {
                ...notification,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                read: false,
            };
            setNotifications(prev => [newNotification, ...prev]);
        },
        []
    );

    const refreshNotifications = useCallback(async () => {
        await fetchNotifications();
    }, [fetchNotifications]);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications(): NotificationContextType {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
