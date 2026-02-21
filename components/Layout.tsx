import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { LayoutDashboard, FolderKanban, Settings, Menu, Search, Plus, User as UserIcon, LogOut, Command, ChevronRight, ChevronUp, Home, Sun, Moon, Monitor, CheckSquare, Package, Folder, Users, Activity, Zap, Mail, CreditCard } from 'lucide-react';
import { cn, Button, Avatar, ToastProvider, CommandPalette } from './ui/design-system';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { TAB_INDEX_MAP } from '../constants';
import { MotionifyLogo } from './brand/MotionifyLogo';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { useAuthContext } from '../contexts/AuthContext';
import { isSuperAdmin, isClient, getRoleLabel } from '../lib/permissions';
import { NotificationBell } from './notifications';

const SidebarItem = ({ icon: Icon, label, path, active, count }: { icon: any, label, path: string, active: boolean, count?: number }) => (
  <Link to={path}>
    <div
      className={cn(
        "group flex items-center justify-between w-full px-3 py-2 text-[14px] font-medium rounded-md transition-colors duration-150",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={cn("text-[12px] tabular-nums px-1.5 py-0.5 rounded transition-colors font-medium", active ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </div>
  </Link>
);

// Simplified RevisionBattery Component (no line graph)
const RevisionBattery: React.FC<{ used: number; max: number }> = ({ used, max }) => {
  const remaining = Math.max(0, max - used);
  const percentage = Math.round((remaining / max) * 100);

  // Determine color based on remaining percentage
  let colorClass = "bg-emerald-500";
  let textColor = "text-emerald-700";
  if (percentage <= 20) {
    colorClass = "bg-red-500";
    textColor = "text-red-700";
  } else if (percentage <= 50) {
    colorClass = "bg-amber-500";
    textColor = "text-amber-700";
  }

  return (
    <div className="flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm">
      {/* Label */}
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        Revisions
      </span>

      {/* Count */}
      <span className={cn("text-xs font-bold leading-none", textColor)}>
        {remaining} of {max}
      </span>

      {/* Battery Icon */}
      <div className="relative flex items-center">
        <div className="h-4 w-7 rounded-[3px] border-2 border-border p-0.5 relative flex items-center bg-card">
          <div
            className={cn("h-full rounded-[1px] transition-all duration-500", colorClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Battery Nub */}
        <div className="h-1.5 w-0.5 bg-border rounded-r-[1px] absolute -right-0.5" />

        {/* Charging Bolt */}
        {percentage > 0 && (
          <Zap className={cn("absolute -top-0.5 -right-1 h-2.5 w-2.5 fill-current stroke-white", colorClass.replace('bg-', 'text-'))} />
        )}
      </div>
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const commandItems = [
    ...(!isClient(user) ? [{ label: 'Go to Dashboard', icon: Home, action: () => navigate('/'), group: 'Navigation' }] : []),
    { label: 'Go to Projects', icon: FolderKanban, action: () => navigate('/projects'), group: 'Navigation' },
    { label: 'Go to Settings', icon: Settings, action: () => navigate('/settings'), group: 'Navigation' },
    { label: 'Create New Project', icon: Plus, action: () => navigate('/projects/new'), group: 'Actions' },
    { label: 'Toggle Sidebar', icon: Menu, action: () => setSidebarOpen(!sidebarOpen), group: 'View' },
    { label: 'Logout', icon: LogOut, action: () => logout(), group: 'Account' },
  ];

  // Global Keyboard Shortcuts
  const globalShortcuts: KeyboardShortcut[] = [
    // Command Palette
    {
      key: 'k',
      modifiers: ['cmd'],
      description: 'Open command palette',
      action: () => setCommandOpen(open => !open),
      category: 'ui',
    },
    // Navigation - Go to pages (g + letter)
    ...(!isClient(user) ? [{
      key: 'd',
      sequence: 'g d',
      description: 'Go to Dashboard',
      action: () => navigate('/'),
      category: 'navigation' as const,
    }] : []),
    {
      key: 'p',
      sequence: 'g p',
      description: 'Go to Projects',
      action: () => navigate('/projects'),
      category: 'navigation',
    },
    {
      key: 's',
      sequence: 'g s',
      description: 'Go to Settings',
      action: () => navigate('/settings'),
      category: 'navigation',
    },
    // Quick Actions
    {
      key: 'n',
      modifiers: ['cmd'],
      description: 'Create new production',
      action: () => navigate('/projects/new'),
      category: 'actions',
    },
    // Navigation - History
    {
      key: '[',
      modifiers: ['cmd'],
      description: 'Go back',
      action: () => window.history.back(),
      category: 'navigation',
    },
    {
      key: ']',
      modifiers: ['cmd'],
      description: 'Go forward',
      action: () => window.history.forward(),
      category: 'navigation',
    },
    // UI
    {
      key: 'b',
      modifiers: ['cmd'],
      description: 'Toggle sidebar',
      action: () => setSidebarOpen(open => !open),
      category: 'ui',
    },
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      },
      category: 'ui',
    },
    // Logout
    {
      key: 'l',
      modifiers: ['cmd', 'shift'],
      description: 'Logout',
      action: () => logout(),
      category: 'actions',
    },
  ];

  useKeyboardShortcuts({ shortcuts: globalShortcuts });



  // Detect if on project detail page
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const isProjectPage = !!projectMatch;

  // Get current tab from URL
  const currentTabIndex = location.pathname.split('/')[3];
  const activeTab = currentTabIndex ? parseInt(currentTabIndex) : 1;

  return (
    <ToastProvider>
      {/* Accessibility: Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-card focus:text-primary focus:font-bold focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-primary transition-all"
      >
        Skip to content
      </a>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} items={commandItems} />
      <KeyboardShortcutsHelp shortcuts={globalShortcuts} />

      <div className="h-screen w-full flex overflow-hidden bg-background font-sans text-foreground">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — same bg as canvas, border-only separation */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-56 bg-background border-r border-border transform transition-transform duration-200 ease-out lg:transform-none flex flex-col h-full",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo */}
          <div className="h-14 flex items-center px-4 shrink-0 border-b border-border">
            <Link to="/" className="flex items-center cursor-pointer">
              <img
                src={mounted && resolvedTheme === 'dark'
                  ? `${import.meta.env.BASE_URL}motionify-dark-logo.png`
                  : `${import.meta.env.BASE_URL}motionify-studio-dark.png`}
                alt="Motionify Studio"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Nav sections */}
          <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Workspace
              </div>
              <div className="space-y-0.5">
                {!isClient(user) && (
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Dashboard"
                    path="/"
                    active={location.pathname === '/'}
                  />
                )}
                <SidebarItem
                  icon={FolderKanban}
                  label="Projects"
                  path="/projects"
                  active={location.pathname.startsWith('/projects')}
                />
                <SidebarItem
                  icon={Mail}
                  label="Inquiries"
                  path="/admin/inquiries"
                  active={location.pathname.startsWith('/admin/inquiries')}
                />
                <SidebarItem
                  icon={CreditCard}
                  label="Payments"
                  path="/admin/payments"
                  active={location.pathname === '/admin/payments'}
                />
              </div>
            </div>

            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                System
              </div>
              <div className="space-y-0.5">
                <SidebarItem
                  icon={Settings}
                  label="Settings"
                  path="/settings"
                  active={location.pathname === '/settings'}
                />
                {isSuperAdmin(user) && (
                  <SidebarItem
                    icon={UserIcon}
                    label="Team"
                    path="/admin/users"
                    active={location.pathname === '/admin/users'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* User footer */}
          <div className="p-3 border-t border-border shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group"
                  aria-label="User menu"
                >
                  <Avatar src={user?.avatar} fallback={user?.name?.[0] || 'U'} className="h-7 w-7" />
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-[14px] font-medium truncate text-foreground">{user?.name || 'User'}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{user?.role ? getRoleLabel(user.role) : 'User'}</p>
                  </div>
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.role ? getRoleLabel(user.role) : ''}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" onClick={() => setSidebarOpen(false)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => { setSidebarOpen(false); logout(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 flex flex-col min-w-0 bg-background h-full relative focus:outline-none"
        >
          {/* Top bar — minimal, functional */}
          <header className="h-14 border-b border-border z-30 shrink-0 sticky top-0 bg-background">
            <div className="h-full flex items-center justify-between px-6">
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="lg:hidden mr-3 h-8 w-8" onClick={() => setSidebarOpen(true)} id="mobile-menu-btn">
                  <Menu className="h-4 w-4" />
                </Button>

                <nav className="hidden md:flex items-center text-[14px] text-muted-foreground">
                  <span className="hover:text-foreground cursor-pointer transition-colors">Workspace</span>
                  <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/50" />
                  <span className="font-medium text-foreground">
                    {location.pathname === '/' ? 'Dashboard' :
                      location.pathname.startsWith('/projects') ? 'Projects' : 'Page'}
                  </span>
                </nav>
              </div>

              <div className="flex items-center gap-1">
                {/* Search trigger */}
                <button
                  onClick={() => setCommandOpen(true)}
                  className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-background text-[14px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                  <div className="flex items-center gap-0.5 ml-4">
                    <kbd className="rounded border border-border px-1 text-[10px] font-medium text-muted-foreground">⌘</kbd>
                    <kbd className="rounded border border-border px-1 text-[10px] font-medium text-muted-foreground">K</kbd>
                  </div>
                </button>

                <NotificationBell />

                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                    title={`Theme: ${theme} (click to change)`}
                  >
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4" />
                    ) : theme === 'light' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div key={location.pathname} className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 py-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};