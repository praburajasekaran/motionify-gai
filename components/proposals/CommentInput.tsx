import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface CommentInputProps {
    onSubmit: (content: string) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
}

export function CommentInput({ onSubmit, placeholder = 'Write a comment...', disabled }: CommentInputProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEmpty = content.trim().length === 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isEmpty || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(content.trim());
            setContent('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                disabled={disabled || isSubmitting}
                className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isEmpty && !isSubmitting) {
                            handleSubmit(e);
                        }
                    }
                }}
            />
            <Button
                type="submit"
                disabled={isEmpty || disabled || isSubmitting}
                className="shrink-0"
            >
                <Send className="w-4 h-4" />
            </Button>
        </form>
    );
}
