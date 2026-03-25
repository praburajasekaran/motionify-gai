'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/lib/portal/types/auth.types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
            router.push('/unauthorized'); // Or some other error page
        }
    }, [user, isLoading, allowedRoles, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return null; // Will redirect in useEffect
    }

    return <>{children}</>;
}
