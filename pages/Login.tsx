import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui/design-system';
import { MotionifyLogo } from '../components/brand/MotionifyLogo';
import { useAuthContext, MOCK_USERS, setMockUser } from '../contexts/AuthContext';
import { User as UserIcon, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthContext();
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = (userKey: string) => {
    const user = MOCK_USERS[userKey];
    if (user) {
      setMockUser(user);
      setUser(user);
      navigate('/');
    }
  };

  const userOptions = [
    { key: 'superAdmin', label: 'Super Admin', description: 'Full system access' },
    { key: 'motionifySupport', label: 'Project Manager', description: 'Manage projects and teams' },
    { key: 'teamMember', label: 'Team Member', description: 'Work on assigned tasks' },
    { key: 'clientPrimary', label: 'Client (Primary Contact)', description: 'Approve deliverables' },
    { key: 'clientTeam', label: 'Client (Team Member)', description: 'View-only access' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <MotionifyLogo variant="full" size="lg" animated />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Select a user to login (Development Mode)</p>
        </div>

        <Card className="p-6 space-y-4">
          {userOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => handleLogin(option.key)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-zinc-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Development Mode - Authentication will be implemented in production
          </p>
        </div>
      </div>
    </div>
  );
};
