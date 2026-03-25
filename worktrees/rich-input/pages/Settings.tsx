import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Bell, MessageSquare, Briefcase, Zap } from 'lucide-react';

interface UserPreferences {
    email_task_assignment: boolean;
    email_mention: boolean;
    email_project_update: boolean;
    email_marketing: boolean;
}

export function Settings() {
    const { user } = useAuthContext();
    const [preferences, setPreferences] = useState<UserPreferences>({
        email_task_assignment: true,
        email_mention: true,
        email_project_update: true,
        email_marketing: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchPreferences();
        }
    }, [user?.id]);

    const fetchPreferences = async () => {
        try {
            const response = await fetch(`/.netlify/functions/users-settings?userId=${user?.id}`);
            if (!response.ok) throw new Error('Failed to fetch settings');
            const data = await response.json();
            if (data.preferences) {
                setPreferences(data.preferences);
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const updatePreference = async (key: keyof UserPreferences, value: boolean) => {
        // Optimistic update
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);
        setIsSaving(true);

        try {
            const response = await fetch(`/.netlify/functions/users-settings?userId=${user?.id}`, {
                method: 'PUT',
                body: JSON.stringify(newPreferences),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to update settings');

            // confirm save silently or showing generic 'saved' state if needed
            // toast.success('Settings saved'); 
        } catch (error) {
            console.error('Error updating preferences:', error);
            toast.error('Failed to save changes');
            // Revert on error
            setPreferences(prev => ({ ...prev, [key]: !value }));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences and notifications.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle>Email Notifications</CardTitle>
                    </div>
                    <CardDescription>
                        Choose what emails you want to receive from Motionify.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">

                    <div className="flex items-start space-x-4">
                        <Checkbox
                            id="task_assignment"
                            checked={preferences.email_task_assignment}
                            onCheckedChange={(checked) => updatePreference('email_task_assignment', checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="task_assignment" className="font-medium text-base flex items-center gap-2 cursor-pointer">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                Task Assignments
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails when you are assigned to a new task.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4">
                        <Checkbox
                            id="mentions"
                            checked={preferences.email_mention}
                            onCheckedChange={(checked) => updatePreference('email_mention', checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="mentions" className="font-medium text-base flex items-center gap-2 cursor-pointer">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                Mentions & Comments
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails when someone mentions you in a comment.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4">
                        <Checkbox
                            id="project_updates"
                            checked={preferences.email_project_update}
                            onCheckedChange={(checked) => updatePreference('email_project_update', checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="project_updates" className="font-medium text-base flex items-center gap-2 cursor-pointer">
                                <Bell className="h-4 w-4 text-muted-foreground" />
                                Project Updates
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails about important project status changes and deliverables.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4 pt-4 border-t">
                        <Checkbox
                            id="marketing"
                            checked={preferences.email_marketing}
                            onCheckedChange={(checked) => updatePreference('email_marketing', checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="marketing" className="font-medium text-base flex items-center gap-2 cursor-pointer">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                Product Updates
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Receive occasional news about new features and improvements.
                            </p>
                        </div>
                    </div>

                </CardContent>
            </Card>

            <div className="flex justify-end text-sm text-muted-foreground">
                {isSaving ? 'Saving...' : 'Changes are saved automatically'}
            </div>
        </div>
    );
}
