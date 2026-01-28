import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Menu, Search, Plus, User as UserIcon, LogOut, Command, ChevronRight, Home, Sun, Moon, CheckSquare, Package, Folder, Users, Activity, Zap, Mail, CreditCard } from 'lucide-react';
import { cn, Button, Avatar, ToastProvider, CommandPalette } from './ui/design-system';
import { TAB_INDEX_MAP } from '../constants';
import { MotionifyLogo } from './brand/MotionifyLogo';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { useAuthContext } from '../contexts/AuthContext';
import { isSuperAdmin, getRoleLabel } from '../lib/permissions';
import { NotificationBell } from './notifications';

const SidebarItem = ({ icon: Icon, label, path, active, count }: { icon: any, label, path: string, active: boolean, count?: number }) => (
  <Link to={path}>
    <div
      className={cn(
        "group flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out border border-transparent",
        active
          ? "bg-gradient-to-r from-primary/10 to-transparent text-primary border-l-primary/50"
          : "text-muted-foreground hover:bg-zinc-100/50 hover:text-foreground hover:pl-5"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4.5 w-4.5 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        {label}
      </div>
      {count !== undefined && (
        <span className={cn("text-xs px-2 py-0.5 rounded-full transition-colors font-semibold", active ? "bg-primary/20 text-primary" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200")}>
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
    <div className="flex items-center gap-3 bg-white border border-zinc-200/80 px-3 py-1.5 rounded-lg shadow-sm">
      {/* Label */}
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        Revisions
      </span>

      {/* Count */}
      <span className={cn("text-xs font-bold leading-none", textColor)}>
        {remaining} of {max}
      </span>

      {/* Battery Icon */}
      <div className="relative flex items-center">
        <div className="h-4 w-7 rounded-[3px] border-2 border-zinc-300 p-0.5 relative flex items-center bg-white">
          <div
            className={cn("h-full rounded-[1px] transition-all duration-500", colorClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Battery Nub */}
        <div className="h-1.5 w-0.5 bg-zinc-300 rounded-r-[1px] absolute -right-0.5" />

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const commandItems = [
    { label: 'Go to Dashboard', icon: Home, action: () => navigate('/'), group: 'Navigation' },
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
    {
      key: 'd',
      sequence: 'g d',
      description: 'Go to Dashboard',
      action: () => navigate('/'),
      category: 'navigation',
    },
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:font-bold focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-primary transition-all"
      >
        Skip to content
      </a>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} items={commandItems} />
      <KeyboardShortcutsHelp shortcuts={globalShortcuts} />

      <div className="h-screen w-full flex overflow-hidden bg-zinc-50 font-sans text-foreground">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-zinc-200 transform transition-transform duration-300 ease-out lg:transform-none flex flex-col h-full shadow-lg",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-20 flex items-center px-6 shrink-0">
            <Link to="/" className="flex items-center group cursor-pointer">
              <img
                src="/motionify-studio-dark.png"
                alt="Motionify Studio"
                className="h-16 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex-1 py-6 px-4 space-y-8 overflow-y-auto">
            <div>
              <div className="px-4 mb-3 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Workspace
              </div>
              <div className="space-y-1">
                <SidebarItem
                  icon={LayoutDashboard}
                  label="Dashboard"
                  path="/"
                  active={location.pathname === '/'}
                />
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
              <div className="px-4 mb-3 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                System
              </div>
              <div className="space-y-1">
                <SidebarItem
                  icon={Settings}
                  label="Settings"
                  path="/settings"
                  active={location.pathname === '/settings'}
                />
                <SidebarItem
                  icon={UserIcon}
                  label="Team"
                  path="/admin/users"
                  active={location.pathname === '/admin/users'}
                />
                <div
                  onClick={logout}
                  className="group flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out border border-transparent text-muted-foreground hover:bg-zinc-100/50 hover:text-foreground hover:pl-5 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4.5 w-4.5 transition-colors text-muted-foreground group-hover:text-foreground" />
                    Log Out
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-100 shrink-0">
            <div
              id="logout-btn"
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-b from-white to-zinc-50 border border-zinc-200/60 hover:border-zinc-300 transition-colors cursor-pointer group shadow-sm hover:shadow-md"
              onClick={logout}
              title="Logout"
            >
              <Avatar src={user?.avatar} fallback={user?.name?.[0] || 'U'} className="h-9 w-9 ring-2 ring-white" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate text-foreground">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.role ? getRoleLabel(user.role) : 'User'}</p>
              </div>
              <LogOut className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 h-full relative focus:outline-none"
        >
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-zinc-200 z-30 shrink-0 sticky top-0 shadow-sm">
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 lg:px-10">
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="lg:hidden mr-4" onClick={() => setSidebarOpen(true)} id="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>

                <nav className="hidden md:flex items-center text-sm text-muted-foreground">
                  <span className="hover:text-foreground cursor-pointer transition-colors font-medium">Workspace</span>
                  <ChevronRight className="h-4 w-4 mx-2 text-zinc-300" />
                  <span className={cn("font-semibold text-foreground animate-in fade-in slide-in-from-left-2")}>
                    {location.pathname === '/' ? 'Dashboard' :
                      location.pathname.startsWith('/projects') ? 'Projects' : 'Page'}
                  </span>
                </nav>
              </div>

              <div className="flex items-center gap-3 md:gap-5">
                <div className="hidden md:flex items-center relative group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="h-9 w-40 rounded-full border border-zinc-200 bg-white/50 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-zinc-400 shadow-sm"
                    onClick={() => setCommandOpen(true)}
                    readOnly
                  />
                  <div className="absolute right-3 top-2.5 hidden lg:flex items-center gap-1">
                    <kbd className="hidden sm:inline-block rounded bg-zinc-100 border border-zinc-200 px-1.5 text-[10px] font-bold text-zinc-500 shadow-sm">⌘</kbd>
                    <kbd className="hidden sm:inline-block rounded bg-zinc-100 border border-zinc-200 px-1.5 text-[10px] font-bold text-zinc-500 shadow-sm">K</kbd>
                  </div>
                </div>

                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Page Content with Entrance Animation */}
          <div key={location.pathname} className="flex-1 overflow-y-auto scroll-smooth">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 lg:py-10 animate-fade-in-up">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};