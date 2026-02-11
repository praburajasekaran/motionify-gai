'use client';

import React from 'react';
import { Notification } from '@/lib/portal/types/notification-types';
import { formatTimeAgo } from '@/lib/portal/utils/notification-utils';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
    notification: Notification;
    onClick: (notification: Notification) => void;
    isUnread: boolean;
}

/**
 * NotificationItem Component
 * 
 * Displays a single notification with icon, message, time ago, and visual distinction
 * for unread items. Matches test case TC-NOT-004 requirements.
 */
export default function NotificationItem({ notification, onClick, isUnread }: NotificationItemProps) {
    const handleClick = () => {
        onClick(notification);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(notification);
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            className={cn(
                "flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50",
                "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset",
                isUnread && "border-l-4 border-l-blue-500"
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            {/* Icon */}
            <div className="flex-shrink-0 text-2xl leading-none pt-0.5">
                {notification.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Message - truncate to 2 lines */}
                <p
                    className={cn(
                        "text-sm line-clamp-2",
                        isUnread ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                    )}
                >
                    {notification.message}
                </p>

                {/* Project name & Time */}
                <div className="flex items-center gap-2 mt-1">
                    {notification.metadata?.projectName && (
                        <>
                            <span className="text-xs text-muted-foreground">
                                {notification.metadata.projectName}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                        </>
                    )}
                    <span
                        className={cn(
                            "text-xs",
                            isUnread ? "text-blue-500 font-medium" : "text-muted-foreground"
                        )}
                    >
                        {formatTimeAgo(notification.createdAt)}
                    </span>
                </div>
            </div>
        </div>
    );
}
