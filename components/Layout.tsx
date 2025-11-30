import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Menu, Bell, Search, Plus, User as UserIcon, LogOut, Command, ChevronRight, Home, Sun, Moon } from 'lucide-react';
import { cn, Button, Avatar, ToastProvider, CommandPalette } from './ui/design-system';
import { CURRENT_USER } from '../constants';

const SidebarItem = ({ icon: Icon, label, path, active, count }: { icon: any, label: string, path: string, active: boolean, count?: number }) => (
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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commandItems = [
      { label: 'Go to Dashboard', icon: Home, action: () => navigate('/'), group: 'Navigation' },
      { label: 'Go to Projects', icon: FolderKanban, action: () => navigate('/projects'), group: 'Navigation' },
      { label: 'Go to Settings', icon: Settings, action: () => navigate('/settings'), group: 'Navigation' },
      { label: 'Create New Project', icon: Plus, action: () => navigate('/projects/new'), group: 'Actions' },
      { label: 'Toggle Sidebar', icon: Menu, action: () => setSidebarOpen(!sidebarOpen), group: 'View' },
  ];

  return (
    <ToastProvider>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} items={commandItems} />
        
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
            "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/70 backdrop-blur-2xl border-r border-zinc-200/60 transform transition-transform duration-300 ease-out lg:transform-none flex flex-col h-full shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="h-20 flex items-center px-6 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/20">
                    <span className="text-white text-xl font-bold">M</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-foreground leading-tight">Motionify</h1>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">PM Portal</p>
                </div>
            </div>
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
                        count={12}
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
                        path="/team" 
                        active={location.pathname === '/team'} 
                    />
                </div>
            </div>
            </div>

            <div className="p-4 border-t border-zinc-100 shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-b from-white to-zinc-50 border border-zinc-200/60 hover:border-zinc-300 transition-colors cursor-pointer group shadow-sm hover:shadow-md">
                <Avatar src={CURRENT_USER.avatar} fallback="ME" className="h-9 w-9 ring-2 ring-white" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate text-foreground">{CURRENT_USER.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{CURRENT_USER.role}</p>
                </div>
                <LogOut className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </div>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 h-full relative">
            {/* Top Header */}
            <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50 flex items-center justify-between px-6 lg:px-10 z-30 shrink-0 sticky top-0 shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
                </Button>
                
                {/* Breadcrumb */}
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
                    className="h-9 w-64 rounded-full border border-zinc-200 bg-white/50 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-zinc-400 shadow-sm"
                    onClick={() => setCommandOpen(true)}
                    readOnly
                    />
                    <div className="absolute right-3 top-2.5 hidden lg:flex items-center gap-1">
                        <kbd className="hidden sm:inline-block rounded bg-zinc-100 border border-zinc-200 px-1.5 text-[10px] font-bold text-zinc-500 shadow-sm">⌘</kbd>
                        <kbd className="hidden sm:inline-block rounded bg-zinc-100 border border-zinc-200 px-1.5 text-[10px] font-bold text-zinc-500 shadow-sm">K</kbd>
                    </div>
                </div>
                
                <div className="h-6 w-px bg-zinc-200 hidden md:block" />

                <Button variant="ghost" size="icon" className="relative hover:bg-zinc-100 rounded-full">
                    <Bell className="h-5 w-5 text-zinc-500" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                </Button>

                <Link to="/projects/new">
                    <Button size="sm" variant="gradient" className="hidden sm:flex gap-2 rounded-full px-5 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                    <Plus className="h-4 w-4" />
                    New Project
                    </Button>
                </Link>
            </div>
            </header>

            {/* Page Content with Entrance Animation */}
            <div key={location.pathname} className="flex-1 p-6 lg:p-10 overflow-y-auto scroll-smooth animate-fade-in-up">
            {children}
            </div>
        </main>
        </div>
    </ToastProvider>
  );
};