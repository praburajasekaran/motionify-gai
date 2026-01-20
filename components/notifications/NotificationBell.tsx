/**
 * NotificationBell Component
 *
 * Bell icon with unread count badge and dropdown.
 * Implements TC-NT-004: In-App Notification Bell
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn, Button } from '../ui/design-system';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

function formatUnreadCount(count: number): string {
    if (count > 99) return '99+';
    return count.toString();
}

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    return (
        <div className="relative">
            <Button
                ref={buttonRef}
                variant="ghost"
                size="icon"
                className="relative hover:bg-zinc-100 rounded-full"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Bell className="h-5 w-5 text-zinc-500" />

                {/* Badge with animated ping effect */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                            {formatUnreadCount(unreadCount)}
                        </span>
                    </span>
                )}
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <NotificationDropdown
                        notifications={notifications}
                        onMarkAsRead={markAsRead}
                        onMarkAllAsRead={markAllAsRead}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
