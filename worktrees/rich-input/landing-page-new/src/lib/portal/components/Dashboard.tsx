'use client';

import React, { useContext, useState } from 'react';
import Image from 'next/image';
import { Home, ClipboardList, FolderKanban, Users2 } from 'lucide-react';
import ProjectHome from './ProjectOverview';
import TaskList from './TaskList';
import TeamManagement from './TeamManagement';
import Files from './Files';
import { AppContext } from '@/lib/portal/AppContext';
import ClientLogo from './ui/ClientLogo';

type ActiveView = 'home' | 'tasks' | 'files' | 'team';

const Sidebar = ({ activeView, setView }: { activeView: ActiveView, setView: (view: ActiveView) => void }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'files', label: 'Files', icon: FolderKanban },
    { id: 'team', label: 'Team', icon: Users2 },
  ];

  return (
    <aside className="w-20 lg:w-64 flex-shrink-0 bg-[var(--todoist-white)] border-r border-[var(--todoist-gray-200)] flex flex-col transition-all duration-300">
      {/* Logo Section */}
      <div className="px-4 py-6 border-b border-[var(--todoist-gray-200)]">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-32 hidden lg:block">
            <Image
              src="/motionify-studio-dark.png"
              alt="Motionify Studio"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--todoist-gray-500)] hidden lg:block">Navigate</h2>
      </div>
      <nav className="flex-1 px-3 space-y-2">
        {navItems.map(item => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView(item.id as ActiveView);
              }}
              title={item.label}
              className={`flex items-center justify-center lg:justify-start px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)] border-l-4 border-[var(--todoist-red)]'
                  : 'hover:bg-[var(--todoist-gray-50)] text-[var(--todoist-gray-700)]'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0 lg:mr-3" />
              <span className="hidden lg:inline">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
};


const Dashboard = () => {
  const { project } = useContext(AppContext);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [focusedDeliverableId, setFocusedDeliverableId] = useState<string | null>(null);

  const handleDeliverableSelect = (deliverableId: string) => {
    setActiveView('tasks');
    setFocusedDeliverableId(deliverableId);
  };

  const renderView = () => {
    switch(activeView) {
      case 'home':
        return <ProjectHome onSelectDeliverable={handleDeliverableSelect} />;
      case 'tasks':
        return <TaskList focusedDeliverableId={focusedDeliverableId} setFocusedDeliverableId={setFocusedDeliverableId} />;
      case 'files':
        return <Files />;
      case 'team':
        return <TeamManagement />;
      default:
        return <ProjectHome onSelectDeliverable={handleDeliverableSelect} />;
    }
  };

  if (!project) return null;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar activeView={activeView} setView={setActiveView} />
      <main className="flex-1 bg-[var(--todoist-gray-50)] overflow-y-auto">
        {/* Todoist-style clean background with doubled whitespace (Heuristic #3) */}
        <div className="p-8 sm:p-12 space-y-8">
          <div className="flex items-center gap-6">
            <ClientLogo client={project.client} className="h-12 w-12 rounded-lg border border-[var(--todoist-gray-200)]" />
            <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--todoist-gray-900)]">
              {project.name}
            </h1>
          </div>
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

