/**
 * NotificationDropdown Component
 *
 * Dropdown content displaying the list of notifications with grouping.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, Button } from '../ui/design-system';
import { AppNotification } from '../../contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { CheckCheck } from 'lucide-react';

interface NotificationDropdownProps {
    notifications: AppNotification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClose: () => void;
}

export function NotificationDropdown({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClose,
}: NotificationDropdownProps) {
    const navigate = useNavigate();

    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);

    // Limit displayed notifications
    const maxDisplay = 10;
    const displayedUnread = unread.slice(0, maxDisplay);
    const displayedRead = read.slice(0, Math.max(0, maxDisplay - displayedUnread.length));

    const handleNotificationClick = (notification: AppNotification) => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
        }
        onClose();
    };

    const handleMarkAllAsRead = () => {
        onMarkAllAsRead();
    };

    return (
        <div className="w-96 max-w-[calc(100vw-2rem)] bg-card rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                    Notifications
                </h3>
                {unread.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleMarkAllAsRead}
                    >
                        <CheckCheck className="h-3.5 w-3.5 mr-1" />
                        Mark all read
                    </Button>
                )}
            </div>

            {/* Notification List */}
            <div className="max-h-[28rem] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                        <div className="text-3xl mb-2">🔔</div>
                        <p className="text-sm text-muted-foreground">
                            No notifications yet
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Unread Section */}
                        {displayedUnread.length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-muted/50">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        New ({unread.length})
                                    </p>
                                </div>
                                {displayedUnread.map((notification) => (
                                    <div key={notification.id}>
                                        <NotificationItem
                                            notification={notification}
                                            onClick={handleNotificationClick}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Read Section */}
                        {displayedRead.length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-muted/50">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Earlier
                                    </p>
                                </div>
                                {displayedRead.map((notification) => (
                                    <div key={notification.id}>
                                        <NotificationItem
                                            notification={notification}
                                            onClick={handleNotificationClick}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-border text-center">
                    <button
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        onClick={() => {
                            navigate('/notifications');
                            onClose();
                        }}
                    >
                        View All Notifications
                    </button>
                </div>
            )}
        </div>
    );
}
