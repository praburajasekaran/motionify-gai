"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SessionExpiredModalProps {
    isOpen: boolean;
    onLogin: () => void;
}

export function SessionExpiredModal({ isOpen, onLogin }: SessionExpiredModalProps) {
    const router = useRouter();

    const handleLogin = () => {
        onLogin();
        router.push('/login');
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader className="flex flex-col items-center space-y-4">
                    <div className="bg-orange-50 p-3 rounded-full">
                        <Clock className="h-8 w-8 text-orange-500" />
                    </div>
                    <DialogTitle className="text-xl text-center">Session Expired</DialogTitle>
                </DialogHeader>
                <div className="text-center space-y-4 py-2">
                    <p className="text-muted-foreground">
                        Your session has expired for security reasons. Please log in again to continue.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        You'll be redirected back to this page after logging in.
                    </p>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={handleLogin} className="w-full sm:w-auto min-w-[140px]">
                        Log In Again
                    </Button>
                </DialogFooter>
                <div className="text-center mt-4">
                    <p className="text-xs text-muted-foreground">
                        💡 Tip: Check "Remember me" to stay logged in for 30 days
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
