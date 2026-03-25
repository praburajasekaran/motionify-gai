import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="text-center space-y-6 max-w-md">
                <h1 className="text-4xl font-bold text-gray-900">401</h1>
                <h2 className="text-2xl font-semibold text-gray-700">Unauthorized Access</h2>
                <p className="text-gray-500">
                    You do not have permission to access this page. Please contact your administrator if you believe this is an error.
                </p>
                <div className="flex justify-center gap-4">
                    <Link href="/portal">
                        <Button>Go to Portal</Button>
                    </Link>
                    <Link href="/">
                        <Button variant="outline">Go Home</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
