'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Notification, NOTIFICATION_CONFIG } from '@/lib/portal/types/notification-types';
import { groupNotifications } from '@/lib/portal/utils/notification-utils';
import NotificationItem from './NotificationItem';
import { Button } from '@/components/ui/button';
import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface NotificationDropdownProps {
    notifications: Notification[];
    onMarkAsRead: (notificationId: string) => void;
    onMarkAllAsRead: () => void;
    onClose: () => void;
}

/**
 * NotificationDropdown Component
 * 
 * Displays notification list with unread/read grouping, individual mark as read,
 * and bulk mark all as read functionality. Matches test cases TC-NOT-004, TC-NOT-005, TC-NOT-006.
 */
export default function NotificationDropdown({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClose,
}: NotificationDropdownProps) {
    const router = useRouter();

    // Group notifications
    const { unread, read } = groupNotifications(notifications);

    // Limit to dropdown max
    const displayedNotifications = notifications.slice(0, NOTIFICATION_CONFIG.DROPDOWN_LIMIT);
    const { unread: displayedUnread, read: displayedRead } = groupNotifications(displayedNotifications);

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }

        // Navigate to action URL if it exists
        if (notification.actionUrl) {
            router.push(notification.actionUrl);
            onClose();
        }
    };

    const handleMarkAllAsRead = () => {
        onMarkAllAsRead();
        toast.success('All notifications marked as read');
    };

    const handleViewAll = () => {
        router.push('/portal/notifications');
        onClose();
    };

    return (
        <div className="w-96 max-w-[calc(100vw-2rem)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <DropdownMenuLabel className="p-0 text-base font-semibold">
                    Notifications
                </DropdownMenuLabel>
                {unread.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleMarkAllAsRead}
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Notification List */}
            <div className="max-h-[32rem] overflow-y-auto">
                {displayedNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            No new notifications
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Unread Section */}
                        {displayedUnread.length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-muted/30">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Unread ({unread.length})
                                    </p>
                                </div>
                                {displayedUnread.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={handleNotificationClick}
                                        isUnread={true}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Read Section */}
                        {displayedRead.length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-muted/30">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Earlier Today
                                    </p>
                                </div>
                                {displayedRead.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={handleNotificationClick}
                                        isUnread={false}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {displayedNotifications.length > 0 && (
                <>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                        <DropdownMenuItem
                            className="w-full justify-center cursor-pointer"
                            onClick={handleViewAll}
                        >
                            <span className="text-sm font-medium text-primary">
                                View All Notifications
                            </span>
                        </DropdownMenuItem>
                    </div>
                </>
            )}
        </div>
    );
}
