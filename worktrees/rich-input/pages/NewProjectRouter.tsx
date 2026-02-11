/**
 * NewProjectRouter.tsx
 * 
 * Smart router component that shows different project creation experiences
 * based on user role:
 * - Clients see StartProductionRequest (simplified form)
 * - Admins/PMs see CreateProject (full wizard)
 */

import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { CreateProject } from './CreateProject';
import { StartProductionRequest } from './StartProductionRequest';

export const NewProjectRouter: React.FC = () => {
    const { user } = useAuthContext();

    // Client users get the simplified request form
    if (user?.role === 'client') {
        return <StartProductionRequest />;
    }

    // Admins, PMs, and super_admins get the full project creation wizard
    return <CreateProject />;
};
