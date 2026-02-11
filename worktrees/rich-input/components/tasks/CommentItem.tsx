import React from 'react';
import { User } from '../../types';
import { Link } from 'react-router-dom';

interface CommentItemProps {
    content: string;
    details: {
        id: string;
        userName: string;
        timestamp: string | number;
        userId?: string;
    };
    currentUser?: User | null;
    onDelete?: (id: string) => void;
    formatTimeAgo: (timestamp: string | number) => string;
    showDelete?: boolean;
    teamMembers?: User[]; // Optional list to link to profiles if needed
}

export const CommentItem: React.FC<CommentItemProps> = ({
    content,
    details,
    currentUser,
    onDelete,
    formatTimeAgo,
    showDelete = false
}) => {
    // Function to parse mentions and wrap them in styling
    const renderContent = (text: string) => {
        // Regex to find @Name
        // We look for @ followed by words. 
        // This should match the regex used in the backend/input: /@([A-Za-z][A-Za-z\s]*?)(?=\s@|\s|,|\.|\!|\?|$)/g

        const parts = text.split(/(@[A-Za-z][A-Za-z\s]*?(?=\s@|\s|,|\.|\!|\?|$))/g);

        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return (
                    <span key={index} className="bg-purple-100 text-purple-700 font-medium px-1 py-0.5 rounded text-xs mx-0.5">
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="flex gap-3 text-sm group relative">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium ring-1 ring-border shrink-0">
                {details.userName[0]}
            </div>

            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-xs">{details.userName}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(details.timestamp)}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm bg-muted/50 p-2 rounded-lg rounded-tl-none break-words">
                    {renderContent(content)}
                </p>
            </div>

            {/* Delete Button */}
            {showDelete && onDelete && (
                <button
                    onClick={() => onDelete(details.id)}
                    className="absolute top-0 right-0 p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Comment"
                >
                    <div className="h-3.5 w-3.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </div>
                </button>
            )}
        </div>
    );
};
