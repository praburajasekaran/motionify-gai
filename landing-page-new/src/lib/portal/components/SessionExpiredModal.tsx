'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SessionExpiredModalProps {
    isOpen: boolean;
}

export default function SessionExpiredModal({ isOpen }: SessionExpiredModalProps) {
    const router = useRouter();

    const handleLogin = () => {
        // Save current path to redirect back after login
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        }
        router.push('/login');
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="mx-auto bg-yellow-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Session Expired</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Your session has expired for security reasons. Please log in again to continue where you left off.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center mt-4">
                    <Button onClick={handleLogin} className="w-full sm:w-auto min-w-[120px]">
                        Log In Again
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
