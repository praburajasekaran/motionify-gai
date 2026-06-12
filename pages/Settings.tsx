import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Building2, Globe, Mail, Save, Shield, User } from 'lucide-react';
import { setUserTimezone } from '@/utils/dateFormatting';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../lib/api-config';
import { getRoleLabel } from '../lib/permissions';

interface AccountSettings {
    email: string;
    name: string;
    role: string;
    organizationName: string | null;
    timezone: string | null;
}

interface SettingsResponse {
    account: AccountSettings;
    preferences?: {
        timezone?: string | null;
    };
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

function ReadOnlyField({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="space-y-2">
            <Label className="font-medium text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
            </Label>
            <Input value={value} readOnly className="bg-muted text-muted-foreground" />
        </div>
    );
}

export function Settings() {
    const { user, refreshSession } = useAuthContext();
    const [account, setAccount] = useState<AccountSettings | null>(null);
    const [name, setName] = useState('');
    const [timezone, setTimezone] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingTimezone, setIsSavingTimezone] = useState(false);

    const browserTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
    const selectedTimezoneOptions = useMemo(() => {
        if (!timezone || timezoneOptions.some(option => option.value === timezone)) {
            return timezoneOptions;
        }

        return [{ value: timezone, label: getTimezoneLabel(timezone) }, ...timezoneOptions];
    }, [timezone, timezoneOptions]);
    const trimmedName = name.trim();
    const hasNameChanges = account ? trimmedName !== account.name : false;
    const canSaveName = hasNameChanges && trimmedName.length > 0;

    useEffect(() => {
        if (user?.id) {
            fetchSettings();
        }
    }, [user?.id]);

    const fetchSettings = async () => {
        setIsLoading(true);

        try {
            const response = await api.get<SettingsResponse>('/users-settings');
            if (!response.success || !response.data?.account) {
                throw new Error(response.error?.message || 'Failed to fetch settings');
            }

            const nextAccount = response.data.account;
            const nextTimezone = nextAccount.timezone ?? response.data.preferences?.timezone ?? null;
            setAccount({ ...nextAccount, timezone: nextTimezone });
            setName(nextAccount.name || '');
            setTimezone(nextTimezone);
            setUserTimezone(nextTimezone);
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const saveName = async () => {
        if (!canSaveName || !account) return;

        setIsSavingName(true);
        try {
            const response = await api.put<SettingsResponse>('/users-settings', {
                full_name: trimmedName,
            });

            if (!response.success || !response.data?.account) {
                throw new Error(response.error?.message || 'Failed to save name');
            }

            const nextAccount = response.data.account;
            setAccount(nextAccount);
            setName(nextAccount.name || '');
            refreshSession();
            toast.success('Name updated');
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error('Failed to save name');
        } finally {
            setIsSavingName(false);
        }
    };

    const updateTimezone = async (nextTimezone: string | null) => {
        const oldTimezone = timezone;
        setTimezone(nextTimezone);
        setUserTimezone(nextTimezone);
        setIsSavingTimezone(true);

        try {
            const response = await api.put<SettingsResponse>('/users-settings', {
                timezone: nextTimezone,
            });

            if (!response.success || !response.data?.account) {
                throw new Error(response.error?.message || 'Failed to update timezone');
            }

            const savedTimezone = response.data.account.timezone ?? null;
            setTimezone(savedTimezone);
            setAccount(response.data.account);
            setUserTimezone(savedTimezone);
            refreshSession();
            toast.success('Timezone updated');
        } catch (error) {
            console.error('Error updating timezone:', error);
            toast.error('Failed to save timezone');
            setTimezone(oldTimezone);
            setUserTimezone(oldTimezone || null);
        } finally {
            setIsSavingTimezone(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="space-y-6 max-w-3xl">
                <PageHeader
                    title="Settings"
                    description="Manage your account preferences."
                />
                <Card>
                    <CardContent className="pt-6 text-sm text-muted-foreground">
                        Account settings are unavailable right now.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <PageHeader
                title="Settings"
                description="Manage your account preferences."
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <CardTitle>Account Details</CardTitle>
                    </div>
                    <CardDescription>
                        Review your account identity and update your display name.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="display-name" className="font-medium text-base flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            Name
                        </Label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Input
                                id="display-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                autoComplete="name"
                                className="sm:flex-1"
                            />
                            <Button
                                type="button"
                                onClick={saveName}
                                disabled={!canSaveName || isSavingName}
                                className="sm:w-auto"
                            >
                                <Save className="h-4 w-4" />
                                {isSavingName ? 'Saving' : 'Save'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <ReadOnlyField icon={Mail} label="Email" value={account.email || 'Not available'} />
                        <ReadOnlyField icon={Shield} label="Role" value={getRoleLabel(account.role as any)} />
                    </div>

                    <ReadOnlyField
                        icon={Building2}
                        label="Organization"
                        value={account.organizationName || 'Not available'}
                    />
                </CardContent>
            </Card>

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
                            value={timezone || ''}
                            onChange={(event) => updateTimezone(event.target.value || null)}
                            disabled={isSavingTimezone}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Browser Default ({browserTimezone})</option>
                            {selectedTimezoneOptions.map(tz => (
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

            <div className="flex justify-end text-sm text-muted-foreground">
                {isSavingTimezone ? 'Saving timezone...' : 'Changes are saved automatically'}
            </div>
        </div>
    );
}
