/**
 * Mention Utility Functions
 * 
 * Helper functions for parsing, extracting, and rendering @mentions in comments.
 */

import React from 'react';
import { User } from '../types';

// Regex to match @mentions - captures @followed by one or more word characters or spaces until end of word
const MENTION_REGEX = /@([A-Za-z][A-Za-z\s]*?)(?=\s@|\s|,|\.|\!|\?|$)/g;

/**
 * Extract all @mentioned names from text
 * @param text - The text to parse
 * @returns Array of mentioned names (without @ symbol)
 */
export function extractMentions(text: string): string[] {
    const matches = text.matchAll(MENTION_REGEX);
    return Array.from(matches, m => m[1].trim());
}

/**
 * Parse @mentions and match them to actual project users
 * @param text - The comment text containing @mentions
 * @param projectUsers - Array of users in the project
 * @returns Array of matched users with their mention text
 */
export function parseMentions(
    text: string,
    projectUsers: User[]
): { userId: string; name: string; mentionText: string }[] {
    const mentionedNames = extractMentions(text);
    const matchedUsers: { userId: string; name: string; mentionText: string }[] = [];

    for (const mentionedName of mentionedNames) {
        // Find user by name (case-insensitive partial match)
        const normalizedMention = mentionedName.toLowerCase();
        const matchedUser = projectUsers.find(user => {
            const normalizedUserName = user.name.toLowerCase();
            // Match full name or first name
            return normalizedUserName === normalizedMention ||
                normalizedUserName.startsWith(normalizedMention) ||
                normalizedMention.startsWith(normalizedUserName.split(' ')[0]);
        });

        if (matchedUser && !matchedUsers.some(m => m.userId === matchedUser.id)) {
            matchedUsers.push({
                userId: matchedUser.id,
                name: matchedUser.name,
                mentionText: `@${mentionedName}`
            });
        }
    }

    return matchedUsers;
}

/**
 * Check if a potential mention matches a user
 * @param query - The text after @ symbol
 * @param users - Array of users to search
 * @returns Filtered array of matching users
 */
export function filterUsersByMentionQuery(query: string, users: User[]): User[] {
    if (!query) return users;
    const normalizedQuery = query.toLowerCase();
    return users.filter(user =>
        user.name.toLowerCase().includes(normalizedQuery)
    );
}

/**
 * Render text with @mentions styled as links
 * @param text - The comment text containing @mentions
 * @param projectUsers - Optional array of users to validate mentions
 * @returns React node with styled mentions
 */
export function renderMentionedText(
    text: string,
    projectUsers?: User[]
): React.ReactNode {
    // Split text by @mention pattern
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(MENTION_REGEX.source, 'g');

    while ((match = regex.exec(text)) !== null) {
        // Add text before the mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const mentionName = match[1].trim();
        const fullMatch = match[0];

        // Check if mention matches a real user
        const isValidMention = !projectUsers || projectUsers.some(
            user => user.name.toLowerCase().includes(mentionName.toLowerCase())
        );

        if (isValidMention) {
            // Styled mention link
            parts.push(
                React.createElement(
                    'span',
                    {
                        key: `mention-${match.index}`,
                        className: 'text-cyan-400 font-semibold cursor-pointer hover:underline',
                        title: `Mentioned: ${mentionName}`
                    },
                    fullMatch
                )
            );
        } else {
            // Plain text if not a valid user
            parts.push(fullMatch);
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}
