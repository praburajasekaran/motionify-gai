"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LogOut, Edit2, Folder, Clock, CheckCircle2, AlertCircle, Mail, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/portal/types/auth.types';

export default function ProfilePage() {
    const { user, updateProfile, isLoading } = useAuth();
    const router = useRouter();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: '',
        emailNotifications: false,
        mentionNotifications: false,
        approvalNotifications: false,
    });

    React.useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    React.useEffect(() => {
        if (user) {
            setEditForm({
                fullName: user.fullName || '',
                emailNotifications: user.preferences?.emailNotifications ?? false,
                mentionNotifications: user.preferences?.mentionNotifications ?? false,
                approvalNotifications: user.preferences?.approvalNotifications ?? false,
            });
        }
    }, [user]);

    const handleSaveProfile = async () => {
        await updateProfile({
            fullName: editForm.fullName,
            preferences: {
                emailNotifications: editForm.emailNotifications,
                mentionNotifications: editForm.mentionNotifications,
                approvalNotifications: editForm.approvalNotifications,
            }
        });
        setIsEditOpen(false);
    };

    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            {/* Profile Overview */}
            <Card>
                <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left w-full">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="text-2xl">
                                    {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-2 flex-1">
                                <div>
                                    <h1 className="text-2xl font-bold">{user.fullName || user.email}</h1>
                                    <p className="text-muted-foreground">{user.email}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                    <Badge variant="secondary" className="capitalize">
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="outline">
                                        Member since {new Date(user.createdAt).toLocaleDateString()}
                                    </Badge>
                                </div>
                            </div>

                            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Profile
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Edit Profile</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="flex justify-center mb-4">
                                            <div className="relative group cursor-pointer">
                                                <Avatar className="h-20 w-20">
                                                    <AvatarImage src={user.avatarUrl || undefined} />
                                                    <AvatarFallback>
                                                        {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xs">Change</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={editForm.fullName}
                                                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-3 pt-2">
                                            <Label>Notification Preferences</Label>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="notif-email"
                                                    checked={editForm.emailNotifications}
                                                    onCheckedChange={(c) => setEditForm({ ...editForm, emailNotifications: c as boolean })}
                                                />
                                                <Label htmlFor="notif-email" className="font-normal">Email me when tasks are assigned</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="notif-mention"
                                                    checked={editForm.mentionNotifications}
                                                    onCheckedChange={(c) => setEditForm({ ...editForm, mentionNotifications: c as boolean })}
                                                />
                                                <Label htmlFor="notif-mention" className="font-normal">Email me when mentioned</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="notif-approval"
                                                    checked={editForm.approvalNotifications}
                                                    onCheckedChange={(c) => setEditForm({ ...editForm, approvalNotifications: c as boolean })}
                                                />
                                                <Label htmlFor="notif-approval" className="font-normal">Email me for approvals</Label>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                        <Button onClick={handleSaveProfile}>Save Changes</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Info Cards */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Profile Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {user.email}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase">Role</Label>
                            <div className="flex items-center gap-2 text-sm capitalize">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                {user.role.replace('_', ' ')}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assigned Projects */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Folder className="h-5 w-5 text-primary" />
                            Assigned Projects
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { name: 'Brand Video Campaign', status: 'In Progress', badge: 'Terms OK', color: 'default' },
                                { name: 'Social Media Package', status: 'In Progress', badge: 'Pending', color: 'secondary' },
                                { name: 'Website Explainer Video', status: 'Completed', badge: 'Approved', color: 'outline' },
                            ].map((project, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
                                    <span className="font-medium text-sm">{project.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">{project.status}</span>
                                        <Badge variant={project.color as any}>
                                            {project.badge}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { icon: CheckCircle2, color: 'text-green-600', text: 'Approved deliverable "Concept Development"', time: '2 hours ago' },
                                { icon: AlertCircle, color: 'text-primary', text: 'Commented on task "Create storyboards"', time: '1 day ago' },
                                { icon: Mail, color: 'text-muted-foreground', text: 'Accepted project terms for "Brand Video Campaign"', time: '3 days ago' },
                            ].map((activity, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                    <activity.icon className={`h-5 w-5 mt-0.5 ${activity.color}`} />
                                    <div className="flex-1">
                                        <p>{activity.text}</p>
                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
