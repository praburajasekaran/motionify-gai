'use client';

import React from 'react';
import { useNotifications, type AppNotification, NOTIFICATION_ICONS } from '@/contexts/NotificationContext';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationDropdown from './NotificationDropdown';
import { formatUnreadCount } from '@/lib/portal/utils/notification-utils';
import { cn } from '@/lib/utils';
import type { Notification, NotificationCategory } from '@/lib/portal/types/notification-types';

/**
 * NotificationBell Component
 *
 * Displays notification bell icon with unread count badge and dropdown menu.
 * Uses NotificationContext for real notification data from the API.
 */
const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [isOpen, setIsOpen] = React.useState(false);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Map AppNotification to Notification format expected by NotificationDropdown
  const mapToNotification = (n: AppNotification): Notification => {
    // Map notification type to category
    const categoryMapping: Record<string, NotificationCategory> = {
      'task_assigned': 'task_updates',
      'task_status_changed': 'task_updates',
      'comment_mention': 'comments_mentions',
      'comment_created': 'comments_mentions',
      'file_uploaded': 'file_updates',
      'approval_request': 'approvals_revisions',
      'revision_requested': 'approvals_revisions',
      'payment_received': 'project_updates',
      'team_member_added': 'team_changes',
      'project_status_changed': 'project_updates',
    };

    return {
      id: n.id,
      userId: '', // Not used in display
      projectId: n.projectId || '',
      type: n.type as Notification['type'],
      category: categoryMapping[n.type] || 'project_updates',
      read: n.read,
      createdAt: new Date(n.timestamp),
      readAt: n.read ? new Date(n.timestamp) : null,
      deletedAt: null,
      title: n.title,
      message: n.message,
      icon: NOTIFICATION_ICONS[n.type] || '🔔',
      actionUrl: n.actionUrl || null,
      actionLabel: n.actionUrl ? 'View' : null,
      metadata: {
        projectName: undefined,
      },
      actorId: null,
      actorName: n.actorName || null,
    };
  };

  const typedNotifications: Notification[] = notifications.map(mapToNotification);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          )}
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" />

          {/* Badge with animated ping effect */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <Badge
                variant="destructive"
                className="relative inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
              >
                {formatUnreadCount(unreadCount)}
              </Badge>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="p-0">
        <NotificationDropdown
          notifications={typedNotifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={handleClose}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
