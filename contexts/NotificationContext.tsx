/**
 * Notification Context
 *
 * Provides in-app notification state and management functions.
 * Fetches real notifications from the database via API.
 * Implements TC-NT-004: In-App Notification Bell
 */

import React, { createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from './AuthContext';
import { API_BASE } from '@/lib/api-config';

// Notification types shared by the Vite Portal and Netlify Functions.
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

const notificationKeys = {
    list: (userId: string) => ['notifications', userId] as const,
};

async function fetchNotifications(userId: string): Promise<AppNotification[]> {
    const response = await fetch(`${API_BASE}/notifications?userId=${userId}`, {
        credentials: 'include',
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to fetch notifications');
    }

    return data.success && data.notifications ? data.notifications : [];
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { user } = useAuthContext();
    const queryClient = useQueryClient();
    const notificationsQuery = useQuery({
        queryKey: user?.id ? notificationKeys.list(user.id) : ['notifications', 'anonymous'],
        queryFn: () => fetchNotifications(user!.id),
        enabled: !!user?.id,
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
        throwOnError: false,
    });

    const notifications = notificationsQuery.data ?? [];

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read).length,
        [notifications]
    );

    const markAsRead = useCallback(async (id: string) => {
        if (!user?.id) return;
        const queryKey = notificationKeys.list(user.id);

        // Optimistic update
        queryClient.setQueryData<AppNotification[]>(queryKey, prev =>
            (prev ?? []).map(n => (n.id === id ? { ...n, read: true } : n))
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
            queryClient.invalidateQueries({ queryKey });
        }
    }, [queryClient, user?.id]);

    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;
        const queryKey = notificationKeys.list(user.id);

        // Optimistic update
        queryClient.setQueryData<AppNotification[]>(queryKey, prev =>
            (prev ?? []).map(n => ({ ...n, read: true }))
        );

        try {
            await fetch(`${API_BASE}/notifications?markAll=true`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user.id }),
            });
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            queryClient.invalidateQueries({ queryKey });
        }
    }, [queryClient, user?.id]);

    const addNotification = useCallback(
        (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
            if (!user?.id) return;
            // For now, just add to local state
            // In production, this would be handled by real-time updates (WebSocket/SSE)
            const newNotification: AppNotification = {
                ...notification,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                read: false,
            };
            queryClient.setQueryData<AppNotification[]>(
                notificationKeys.list(user.id),
                prev => [newNotification, ...(prev ?? [])]
            );
        },
        [queryClient, user?.id]
    );

    const refreshNotifications = useCallback(async () => {
        if (!user?.id) return;
        await queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
    }, [queryClient, user?.id]);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        isLoading: notificationsQuery.isLoading,
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
