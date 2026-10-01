import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PrefetchLink } from '../shared/components/PrefetchLink';
import { useTheme } from 'next-themes';
import { LayoutDashboard, FolderKanban, Settings, Menu, Search, Plus, User as UserIcon, LogOut, ChevronUp, Sun, Moon, Monitor, Mail, CreditCard, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn, Button, Avatar, ToastProvider, CommandPalette } from './ui/design-system';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { useAuthContext } from '../contexts/AuthContext';
import { isSuperAdmin, isClient, getRoleLabel } from '../lib/permissions';
import { NotificationBell } from './notifications';

const SidebarItem = ({ icon: Icon, label, path, active, count }: { icon: React.ElementType, label: string, path: string, active: boolean, count?: number }) => (
  <PrefetchLink to={path} aria-current={active ? 'page' : undefined}>
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
  </PrefetchLink>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSidebarOpen(false), [location.pathname]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setSidebarOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const commandItems = [
    ...(!isClient(user) ? [{ label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/'), group: 'Navigation' }] : []),
    { label: 'Go to Projects', icon: FolderKanban, action: () => navigate('/projects'), group: 'Navigation' },
    { label: 'Go to Inquiries', icon: Mail, action: () => navigate(isClient(user) ? '/inquiries' : '/admin/inquiries'), group: 'Navigation' },
    ...(!isClient(user) ? [{ label: 'Go to Payments', icon: CreditCard, action: () => navigate('/admin/payments'), group: 'Navigation' }] : []),
    ...(isSuperAdmin(user) ? [{ label: 'Go to Team', icon: UserIcon, action: () => navigate('/admin/users'), group: 'Navigation' }] : []),
    { label: 'Go to Settings', icon: Settings, action: () => navigate('/settings'), group: 'Navigation' },
    { label: 'Start a Project', icon: Plus, action: () => navigate('/projects/new'), group: 'Actions' },
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
      description: 'Start a project',
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
      description: 'Open navigation',
      action: () => { if (window.matchMedia('(max-width: 1023px)').matches) setSidebarOpen(open => !open); },
      category: 'ui',
    },
    {
      key: '/',
      description: 'Open command menu',
      action: () => setCommandOpen(true),
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



  const userIsClient = isClient(user);
  const canSeeSystemSection = isSuperAdmin(user);
  const inquiriesPath = userIsClient ? '/inquiries' : '/admin/inquiries';

  const sidebar = (
        <>
          {/* Logo — desktop only; on mobile the header is always visible above the sidebar */}
          <div className="h-14 hidden lg:flex items-center px-4 shrink-0 border-b border-border">
            <PrefetchLink to="/" className="flex items-center cursor-pointer">
              <img
                src={mounted && resolvedTheme === 'dark'
                  ? `${import.meta.env.BASE_URL}motionify-dark-logo.png`
                  : `${import.meta.env.BASE_URL}motionify-studio-dark.png`}
                alt="Motionify Studio"
                className="h-10 w-auto object-contain"
              />
            </PrefetchLink>
          </div>

          {/* Nav sections */}
          <nav aria-label="Workspace" className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
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
                  path={inquiriesPath}
                  active={location.pathname.startsWith('/inquiries') || location.pathname.startsWith('/admin/inquiries')}
                />
                {!userIsClient && (
                  <SidebarItem
                    icon={CreditCard}
                    label="Payments"
                    path="/admin/payments"
                    active={location.pathname === '/admin/payments'}
                  />
                )}
              </div>
            </div>

            {canSeeSystemSection && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                System
              </div>
              <div className="space-y-0.5">
                <SidebarItem
                  icon={UserIcon}
                  label="Team"
                  path="/admin/users"
                  active={location.pathname === '/admin/users'}
                />
              </div>
            </div>
            )}
          </nav>

          {/* User footer */}
          <div className="p-3 border-t border-border shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 w-full p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group text-left"
                  aria-label="User menu"
                >
                  <Avatar src={user?.avatar} fallback={user?.name?.[0] || 'U'} className="h-7 w-7" />
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-[14px] font-medium truncate text-foreground">{user?.name || 'User'}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{user?.role ? getRoleLabel(user.role) : 'User'}</p>
                  </div>
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.role ? getRoleLabel(user.role) : ''}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <PrefetchLink to="/settings" onClick={() => setSidebarOpen(false)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </PrefetchLink>
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
        </>
  );

  return (
    <ToastProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-card focus:text-primary focus:font-bold focus:rounded-md focus:ring-2 focus:ring-primary">
        Skip to content
      </a>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} items={commandItems} />
      <KeyboardShortcutsHelp shortcuts={globalShortcuts} />
      <DialogPrimitive.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/40 lg:hidden" />
        <DialogPrimitive.Content aria-describedby={undefined} className="portal-shell fixed inset-y-0 left-0 z-[80] w-72 max-w-[85vw] flex flex-col bg-background border-r border-border lg:hidden">
          <div className="h-14 px-5 border-b border-border flex items-center justify-between shrink-0">
            <DialogPrimitive.Title className="text-sm font-semibold">Workspace navigation</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close navigation"><X className="h-4 w-4" /></Button>
            </DialogPrimitive.Close>
          </div>
          {sidebar}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      <div className="portal-shell h-dvh w-full flex overflow-hidden bg-background font-sans text-foreground">
        <aside className="hidden lg:flex w-56 shrink-0 bg-background border-r border-border flex-col">{sidebar}</aside>

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 flex flex-col min-w-0 bg-background h-full relative focus:outline-none"
        >
          {/* Top bar — minimal, functional */}
          <header className="h-14 border-b border-border z-[60] shrink-0 sticky top-0 bg-background">
            <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2">
              <div className="flex items-center flex-1 min-w-0">
                <DialogPrimitive.Trigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden mr-2 h-10 w-10 shrink-0" aria-label="Open navigation" id="mobile-menu-btn">
                  <Menu className="h-4 w-4" />
                </Button>
                </DialogPrimitive.Trigger>

                {/* Logo — mobile only (sidebar logo is hidden on mobile) */}
                <PrefetchLink to="/" className="lg:hidden mr-3">
                  <img
                    src={mounted && resolvedTheme === 'dark'
                      ? `${import.meta.env.BASE_URL}motionify-dark-logo.png`
                      : `${import.meta.env.BASE_URL}motionify-studio-dark.png`}
                    alt="Motionify Studio"
                    className="h-8 w-auto object-contain"
                  />
                </PrefetchLink>

                <button
                  aria-label="Open command menu"
                  onClick={() => setCommandOpen(true)}
                  className="hidden md:flex items-center gap-2 h-9 w-full max-w-xl px-3 rounded-lg border border-border bg-card text-[14px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors text-left"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">Go to a page or run a command...</span>
                  <div className="flex items-center gap-0.5">
                    <kbd className="rounded border border-border px-1 text-[10px] font-medium text-muted-foreground">⌘</kbd>
                    <kbd className="rounded border border-border px-1 text-[10px] font-medium text-muted-foreground">K</kbd>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" aria-label="Open command menu" onClick={() => setCommandOpen(true)}>
                  <Search className="h-4 w-4" />
                </Button>
                <NotificationBell />

                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                    title={`Theme: ${theme} (click to change)`}
                    aria-label={`Change theme, current theme is ${theme}`}
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </div>
        </main>
      </div>
      </DialogPrimitive.Root>
    </ToastProvider>
  );
};
