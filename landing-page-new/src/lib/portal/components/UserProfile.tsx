'use client';

import React, { useState, useContext, useMemo, useEffect } from 'react';
import { User, Mail, Shield, Calendar, Save, Camera, Globe } from 'lucide-react';
import Button from './ui/Button';
import { AppContext } from '@/lib/portal/AppContext';
import { updateMyProfile } from '../api/users.api';
import { formatTimestamp, setUserTimezone } from '../utils/dateUtils';
import { API_BASE } from '../utils/api-config';

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

/** Get all IANA timezones. */
function getTimezoneOptions(): { value: string; label: string }[] {
  try {
    const timezones = Intl.supportedValuesOf('timeZone');
    return timezones.map(tz => ({
      value: tz,
      label: getTimezoneLabel(tz),
    }));
  } catch {
    const common = [
      'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'Europe/London', 'Europe/Berlin',
      'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
    ];
    return common.map(tz => ({ value: tz, label: getTimezoneLabel(tz) }));
  }
}

const UserProfile: React.FC = () => {
  const { user, setUser } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
  });

  // Timezone state (separate from profile form — saved to user_preferences)
  const [timezone, setTimezone] = useState<string | null>(null);
  const [isLoadingTimezone, setIsLoadingTimezone] = useState(true);
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  const browserTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  // Fetch timezone from user_preferences on mount
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await fetch(`${API_BASE}/users-settings`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setTimezone(data.preferences.timezone || null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch timezone preference:', err);
      } finally {
        setIsLoadingTimezone(false);
      }
    };
    fetchTimezone();
  }, []);

  const handleTimezoneChange = async (newTimezone: string | null) => {
    const oldTimezone = timezone;
    setTimezone(newTimezone);
    setUserTimezone(newTimezone);
    setIsSavingTimezone(true);

    try {
      const response = await fetch(`${API_BASE}/users-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: newTimezone }),
      });
      if (!response.ok) throw new Error('Failed to save timezone');
    } catch (err) {
      console.error('Failed to save timezone:', err);
      // Revert on error
      setTimezone(oldTimezone);
      setUserTimezone(oldTimezone);
    } finally {
      setIsSavingTimezone(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const result = await updateMyProfile(formData);

    if (result.success && result.user) {
      setSuccess('Profile updated successfully');
      setUser(result.user);
      setIsEditing(false);
    } else {
      setError(result.error || 'Failed to update profile');
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      avatar_url: user?.avatar_url || '',
    });
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Unknown';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'support':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'client':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'team':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--todoist-gray-500)]">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--todoist-gray-900)]">Profile Settings</h1>
        <p className="mt-2 text-sm text-[var(--todoist-gray-600)]">
          Manage your profile information and preferences
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-lg border border-[var(--todoist-gray-200)] overflow-hidden">
        {/* Avatar Section */}
        <div className="bg-gradient-to-r from-[var(--todoist-red)] to-[var(--todoist-red-dark)] px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt={user.full_name}
                  className="h-24 w-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                  <span className="text-3xl font-semibold text-[var(--todoist-gray-600)]">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-[var(--todoist-gray-50)] transition-colors"
                  title="Change avatar"
                >
                  <Camera className="h-4 w-4 text-[var(--todoist-gray-600)]" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-white">{user.full_name}</h2>
              <p className="text-white/80">{user.email}</p>
              <div className="mt-2">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--todoist-gray-900)] mb-4">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
                    required
                  />
                ) : (
                  <div className="px-4 py-2 bg-[var(--todoist-gray-50)] rounded-lg text-[var(--todoist-gray-700)]">
                    {user.full_name}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </label>
                <div className="px-4 py-2 bg-[var(--todoist-gray-50)] rounded-lg text-[var(--todoist-gray-500)]">
                  {user.email}
                  <span className="ml-2 text-xs">(Cannot be changed)</span>
                </div>
              </div>

              {isEditing && (
                <div>
                  <label htmlFor="avatar_url" className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
                    <Camera className="h-4 w-4 inline mr-2" />
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p className="mt-1 text-xs text-[var(--todoist-gray-500)]">
                    Enter a URL to your profile picture
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="pt-6 border-t border-[var(--todoist-gray-200)]">
            <h3 className="text-lg font-semibold text-[var(--todoist-gray-900)] mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
                  Role
                </label>
                <div className="px-4 py-2 bg-[var(--todoist-gray-50)] rounded-lg text-[var(--todoist-gray-700)]">
                  {getRoleLabel(user.role)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Member Since
                </label>
                <div className="px-4 py-2 bg-[var(--todoist-gray-50)] rounded-lg text-[var(--todoist-gray-700)]">
                  {formatTimestamp(user.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-[var(--todoist-gray-200)]">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-700)] hover:bg-[var(--todoist-gray-200)]"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Display Preferences */}
      <div className="bg-white rounded-lg border border-[var(--todoist-gray-200)] p-6">
        <h3 className="text-lg font-semibold text-[var(--todoist-gray-900)] mb-2 flex items-center gap-2">
          <Globe className="h-5 w-5 text-[var(--todoist-red)]" />
          Display Preferences
        </h3>
        <p className="text-sm text-[var(--todoist-gray-500)] mb-4">
          Set your timezone so dates and times display correctly.
        </p>

        <div className="space-y-2">
          <label htmlFor="timezone" className="block text-sm font-medium text-[var(--todoist-gray-700)]">
            Timezone
          </label>
          {isLoadingTimezone ? (
            <div className="px-4 py-2 bg-[var(--todoist-gray-50)] rounded-lg text-[var(--todoist-gray-500)]">
              Loading...
            </div>
          ) : (
            <select
              id="timezone"
              value={timezone || ''}
              onChange={(e) => handleTimezoneChange(e.target.value || null)}
              className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent text-sm"
            >
              <option value="">Browser Default ({browserTimezone})</option>
              {timezoneOptions.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-[var(--todoist-gray-500)]">
            {isSavingTimezone
              ? 'Saving...'
              : 'All dates and times across the app will display in your selected timezone.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
