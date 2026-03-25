import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { Button, Input } from '../ui/design-system';
import { Avatar } from '../ui/design-system';
import { Send } from 'lucide-react';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    users: User[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    onSubmit,
    users,
    placeholder = "Write a comment...",
    disabled = false,
    className
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

    useEffect(() => {
        if (showSuggestions) {
            const query = suggestionQuery.toLowerCase();
            setFilteredUsers(
                users.filter(user =>
                    user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query)
                ).slice(0, 5)
            );
        }
    }, [showSuggestions, suggestionQuery, users]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart || 0;

        onChange(newValue);
        setCursorPosition(newCursorPos);

        // Detect mention trigger
        const textBeforeCursor = newValue.slice(0, newCursorPos);
        const lastAtIndices = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndices !== -1) {
            // Check if @ is at start or preceded by space
            const isStart = lastAtIndices === 0;
            const isPrecededBySpace = lastAtIndices > 0 && textBeforeCursor[lastAtIndices - 1] === ' ';

            if (isStart || isPrecededBySpace) {
                const query = textBeforeCursor.slice(lastAtIndices + 1);
                // Only show if query doesn't contain spaces (simple name matching)
                if (!query.includes(' ')) {
                    setShowSuggestions(true);
                    setSuggestionQuery(query);
                    return;
                }
            }
        }

        setShowSuggestions(false);
    };

    const handleSelectUser = (user: User) => {
        const textBeforeCursor = value.slice(0, cursorPosition);
        const textAfterCursor = value.slice(cursorPosition);

        const lastAtIndices = textBeforeCursor.lastIndexOf('@');
        const prefix = textBeforeCursor.slice(0, lastAtIndices);

        const newValue = `${prefix}@${user.name} ${textAfterCursor}`;

        onChange(newValue);
        setShowSuggestions(false);

        // Refocus and set cursor
        if (inputRef.current) {
            inputRef.current.focus();
            // This timeout ensures focus handles correctly after state update
            setTimeout(() => {
                const newPos = prefix.length + user.name.length + 2; // +2 for @ and space
                inputRef.current?.setSelectionRange(newPos, newPos);
            }, 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (showSuggestions && filteredUsers.length > 0) {
                e.preventDefault();
                handleSelectUser(filteredUsers[0]);
            } else {
                e.preventDefault();
                onSubmit();
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div className={`relative flex gap-2 ${className}`}>
            <div className="relative flex-1">
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="h-10 text-sm pl-3 pr-8 rounded-full border-border bg-muted focus:bg-card transition-colors w-full"
                />

                {showSuggestions && filteredUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                        <div className="py-1">
                            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted border-b border-border">
                                Mention Team Member
                            </div>
                            {filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                    <Avatar src={user.avatar} fallback={user.name[0]} className="h-6 w-6" />
                                    <span className="text-sm text-foreground">{user.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <Button
                size="sm"
                onClick={onSubmit}
                disabled={disabled || !value.trim()}
                className="h-10 px-4 rounded-full"
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
};
