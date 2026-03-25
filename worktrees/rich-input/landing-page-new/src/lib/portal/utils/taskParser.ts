import { User } from '../types';

export interface ParsedTask {
    title: string;
    assigneeId?: string;
    deadline?: string;
}

/**
 * Parse natural language task input to extract assignee and deadline
 * @param input - The raw input string (e.g., "Fix bug @john tomorrow")
 * @param users - List of available users to match against
 * @returns Parsed task details
 */
export function parseTaskInput(input: string, users: User[]): ParsedTask {
    let title = input;
    let assigneeId: string | undefined;
    let deadline: string | undefined;

    // 1. Extract Assignee (@name)
    const assigneeMatch = title.match(/@(\w+)/);
    if (assigneeMatch) {
        const matchedName = assigneeMatch[1].toLowerCase();
        const user = users.find((u) => {
            const firstName = u.name.split(' ')[0].toLowerCase();
            return firstName === matchedName || u.name.toLowerCase().includes(matchedName);
        });

        if (user) {
            assigneeId = user.id;
            // Remove the @name tag from title
            title = title.replace(assigneeMatch[0], '').trim();
        }
    }

    // 2. Extract Deadline (keywords: today, tomorrow, next week)
    // Simple heuristic parsing
    const lowerTitle = title.toLowerCase();
    const today = new Date();

    if (lowerTitle.includes('tomorrow')) {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        deadline = d.toISOString().split('T')[0];
        title = title.replace(/tomorrow/i, '').trim();
    } else if (lowerTitle.includes('next week')) {
        const d = new Date(today);
        d.setDate(d.getDate() + 7);
        deadline = d.toISOString().split('T')[0];
        title = title.replace(/next week/i, '').trim();
    } else if (lowerTitle.includes('today')) {
        deadline = today.toISOString().split('T')[0];
        title = title.replace(/today/i, '').trim();
    }

    // Clean up extra spaces
    title = title.replace(/\s+/g, ' ').trim();

    return {
        title,
        assigneeId,
        deadline,
    };
}
