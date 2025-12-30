
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectSettings } from './pages/ProjectSettings';
import { CreateProject } from './pages/CreateProject';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import PermissionTest from './pages/PermissionTest';
import { DeliverableReview } from './pages/DeliverableReview';
import { InquiryDashboard } from './pages/admin/InquiryDashboard';
import { InquiryDetail } from './pages/admin/InquiryDetail';
import { ProposalBuilder } from './pages/admin/ProposalBuilder';
import { AuthProvider } from './contexts/AuthContext';

// Wrapper for routes that need layout
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes - with layout */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
          <Route path="/projects/new" element={<ProtectedRoute><CreateProject /></ProtectedRoute>} />
          <Route path="/projects/:id/settings" element={<ProtectedRoute><ProjectSettings /></ProtectedRoute>} />
          <Route path="/projects/:id/deliverables/:deliverableId" element={<ProtectedRoute><DeliverableReview /></ProtectedRoute>} />
          <Route path="/projects/:id/:tab?" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/inquiries" element={<ProtectedRoute><InquiryDashboard /></ProtectedRoute>} />
          <Route path="/admin/inquiries/:inquiryId/proposal" element={<ProtectedRoute><ProposalBuilder /></ProtectedRoute>} />
          <Route path="/admin/inquiries/:id" element={<ProtectedRoute><InquiryDetail /></ProtectedRoute>} />

          {/* Permission Testing - Development Only */}
          <Route path="/test/permissions" element={<ProtectedRoute><PermissionTest /></ProtectedRoute>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
