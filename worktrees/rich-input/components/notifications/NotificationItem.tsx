/**
 * NotificationItem Component
 *
 * Displays a single notification in the dropdown list.
 */

import React from 'react';
import { cn } from '../ui/design-system';
import { AppNotification, NOTIFICATION_ICONS } from '../../contexts/NotificationContext';

interface NotificationItemProps {
    notification: AppNotification;
    onClick: (notification: AppNotification) => void;
}

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const icon = NOTIFICATION_ICONS[notification.type] || '📢';

    return (
        <button
            className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                "hover:bg-muted focus:bg-muted focus:outline-none",
                !notification.read && "bg-primary/5"
            )}
            onClick={() => onClick(notification)}
        >
            {/* Icon */}
            <div className="flex-shrink-0 text-xl mt-0.5">
                {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        "text-sm truncate",
                        !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                    )}>
                        {notification.title}
                    </p>
                    {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                    )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {notification.actorName && (
                        <span className="text-xs text-muted-foreground/70">
                            {notification.actorName}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground/50">
                        {formatTimeAgo(notification.timestamp)}
                    </span>
                </div>
            </div>
        </button>
    );
}
