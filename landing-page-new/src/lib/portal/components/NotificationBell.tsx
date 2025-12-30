'use client';

import React, { useContext } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
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
import type { Notification as NewNotification } from '@/lib/portal/types/notification-types';

/**
 * NotificationBell Component
 * 
 * Displays notification bell icon with unread count badge and dropdown menu.
 * Matches test case TC-NOT-004 requirements with ShadCN components and proper styling.
 */
const NotificationBell: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markNotificationsAsRead
  } = useContext(AppContext);

  const [isOpen, setIsOpen] = React.useState(false);

  // Calculate unread count - using old notification structure for now
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markNotificationsAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Type cast old notifications to new format (temporary until we add proper mock data)
  const typedNotifications = notifications as unknown as NewNotification[];

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

