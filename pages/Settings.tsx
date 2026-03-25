import React, { useEffect, useState, useMemo } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Bell, MessageSquare, Briefcase, Zap, Globe } from 'lucide-react';
import { setUserTimezone } from '@/utils/dateFormatting';

interface UserPreferences {
    email_task_assignment: boolean;
    email_mention: boolean;
    email_project_update: boolean;
    email_marketing: boolean;
    timezone?: string | null;
}

/** Build a label like "America/New_York (UTC-5)" for a given IANA timezone. */
function getTimezoneLabel(tz: string): string {
    try {
        const offsetParts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
        }).formatToParts(new Date());
        const offset = offsetParts.find(p => p.type === 'timeZoneName')?.value || '';
        return `${tz.replace(/_/g, ' ')} (${offset})`;
    } catch {
        return tz.replace(/_/g, ' ');
    }
}

/** Get all IANA timezones grouped by region. */
function getTimezoneOptions(): { value: string; label: string }[] {
    try {
        const timezones = Intl.supportedValuesOf('timeZone');
        return timezones.map(tz => ({
            value: tz,
            label: getTimezoneLabel(tz),
        }));
    } catch {
        // Fallback for older browsers
        const common = [
            'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
            'America/Los_Angeles', 'Europe/London', 'Europe/Berlin',
            'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
        ];
        return common.map(tz => ({ value: tz, label: getTimezoneLabel(tz) }));
    }
}

export function Settings() {
    const { user } = useAuthContext();
    const [preferences, setPreferences] = useState<UserPreferences>({
        email_task_assignment: true,
        email_mention: true,
        email_project_update: true,
        email_marketing: false,
        timezone: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const browserTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

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
        } catch (error) {
            console.error('Error updating preferences:', error);
            toast.error('Failed to save changes');
            // Revert on error
            setPreferences(prev => ({ ...prev, [key]: !value }));
        } finally {
            setIsSaving(false);
        }
    };

    const updateTimezone = async (timezone: string | null) => {
        const oldTimezone = preferences.timezone;
        // Optimistic update
        setPreferences(prev => ({ ...prev, timezone }));
        setUserTimezone(timezone);
        setIsSaving(true);

        try {
            const response = await fetch(`/.netlify/functions/users-settings?userId=${user?.id}`, {
                method: 'PUT',
                body: JSON.stringify({ timezone }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to update timezone');
        } catch (error) {
            console.error('Error updating timezone:', error);
            toast.error('Failed to save timezone');
            // Revert on error
            setPreferences(prev => ({ ...prev, timezone: oldTimezone }));
            setUserTimezone(oldTimezone || null);
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
                        <Globe className="h-5 w-5 text-primary" />
                        <CardTitle>Regional Settings</CardTitle>
                    </div>
                    <CardDescription>
                        Set your timezone so dates and times display correctly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="timezone" className="font-medium text-base">
                            Timezone
                        </Label>
                        <select
                            id="timezone"
                            value={preferences.timezone || ''}
                            onChange={(e) => updateTimezone(e.target.value || null)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="">Browser Default ({browserTimezone})</option>
                            {timezoneOptions.map(tz => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-muted-foreground">
                            All dates and times across the app will display in your selected timezone.
                        </p>
                    </div>
                </CardContent>
            </Card>

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
