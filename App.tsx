
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectSettings } from './pages/ProjectSettings';
import { CreateProject } from './pages/CreateProject';
import PermissionTest from './pages/PermissionTest';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/new" element={<CreateProject />} />
            <Route path="/projects/:id/settings" element={<ProjectSettings />} />
            <Route path="/projects/:id/:tab?" element={<ProjectDetail />} />

            {/* Permission Testing - Development Only */}
            <Route path="/test/permissions" element={<PermissionTest />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
