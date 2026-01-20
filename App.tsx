
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectSettings } from './pages/ProjectSettings';
import { CreateProject } from './pages/CreateProject';
import { NewProjectRouter } from './pages/NewProjectRouter';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { InquiryTracking } from './pages/InquiryTracking';
import PermissionTest from './pages/PermissionTest';
import { DeliverableReview } from './pages/DeliverableReview';
import { InquiryDashboard } from './pages/admin/InquiryDashboard';
import { InquiryDetail } from './pages/admin/InquiryDetail';
import { ProposalBuilder } from './pages/admin/ProposalBuilder';
import { ProposalDetail } from './pages/admin/ProposalDetail';
import { UserManagement } from './pages/admin/UserManagement';
import { ActivityLogs } from './pages/admin/ActivityLogs';
import { Settings } from './pages/Settings';
import { Payment } from './pages/client/Payment';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { QueryProvider } from './shared/providers/QueryProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render children with layout if authenticated
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <QueryProvider>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset}>
            <AuthProvider>
              <NotificationProvider>
                <HashRouter>
                  <Routes>
                    {/* Public routes - no layout */}
                    <Route path="/landing" element={<LandingPage />} />
                    <Route path="/inquiry-status/:inquiryNumber" element={<InquiryTracking />} />
                    <Route path="/login" element={<Login />} />

                    {/* Protected routes - with layout */}
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/projects" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
                    <Route path="/projects/new" element={<ProtectedRoute><NewProjectRouter /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/projects/:id/settings" element={<ProtectedRoute><ProjectSettings /></ProtectedRoute>} />
                    <Route path="/projects/:id/deliverables/:deliverableId" element={<ProtectedRoute><DeliverableReview /></ProtectedRoute>} />
                    <Route path="/projects/:id/:tab?" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admin/inquiries" element={<ProtectedRoute><InquiryDashboard /></ProtectedRoute>} />
                    <Route path="/admin/inquiries/:inquiryId/proposal" element={<ProtectedRoute><ProposalBuilder /></ProtectedRoute>} />
                    <Route path="/admin/inquiries/:id" element={<ProtectedRoute><InquiryDetail /></ProtectedRoute>} />
                    <Route path="/admin/proposals/:proposalId" element={<ProtectedRoute><ProposalDetail /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                    <Route path="/admin/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />

                    {/* Client Routes */}
                    <Route path="/payment/:proposalId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />

                    {/* Permission Testing - Development Only */}
                    <Route path="/test/permissions" element={<ProtectedRoute><PermissionTest /></ProtectedRoute>} />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </HashRouter>
              </NotificationProvider>
            </AuthProvider>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </QueryProvider>
  );
}

export default App;

