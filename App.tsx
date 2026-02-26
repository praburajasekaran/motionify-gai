
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import React from 'react';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { isClient } from './lib/permissions';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { QueryProvider } from './shared/providers/QueryProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded page components for route-based code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectList = React.lazy(() => import('./pages/ProjectList').then(m => ({ default: m.ProjectList })));
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const ProjectSettings = React.lazy(() => import('./pages/ProjectSettings').then(m => ({ default: m.ProjectSettings })));
const CreateProject = React.lazy(() => import('./pages/CreateProject').then(m => ({ default: m.CreateProject })));
const NewProjectRouter = React.lazy(() => import('./pages/NewProjectRouter').then(m => ({ default: m.NewProjectRouter })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const InquiryTracking = React.lazy(() => import('./pages/InquiryTracking').then(m => ({ default: m.InquiryTracking })));
const PermissionTest = React.lazy(() => import('./pages/PermissionTest'));
const DeliverableReview = React.lazy(() => import('./pages/DeliverableReview').then(m => ({ default: m.DeliverableReview })));
const InquiryDashboard = React.lazy(() => import('./pages/admin/InquiryDashboard').then(m => ({ default: m.InquiryDashboard })));
const InquiryDetail = React.lazy(() => import('./pages/admin/InquiryDetail').then(m => ({ default: m.InquiryDetail })));
const ProposalBuilder = React.lazy(() => import('./pages/admin/ProposalBuilder').then(m => ({ default: m.ProposalBuilder })));
const ProposalDetail = React.lazy(() => import('./pages/admin/ProposalDetail').then(m => ({ default: m.ProposalDetail })));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ActivityLogs = React.lazy(() => import('./pages/admin/ActivityLogs').then(m => ({ default: m.ActivityLogs })));
const Payments = React.lazy(() => import('./pages/admin/Payments').then(m => ({ default: m.Payments })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Payment = React.lazy(() => import('./pages/client/Payment').then(m => ({ default: m.Payment })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  // Show layout shell with skeleton content while checking authentication
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </Layout>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render children with layout if authenticated
  return <Layout>{children}</Layout>;
}

function ClientHomeRedirect() {
  const { user } = useAuthContext();

  if (!isClient(user)) {
    return <Dashboard />;
  }

  return <Navigate to="/projects" replace />;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryProvider>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset}>
              <BrowserRouter basename="/portal">
                <AuthProvider>
                  <NotificationProvider>
                    <React.Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                      </div>
                    }>
                      <Routes>
                        {/* Public routes - no layout */}
                        <Route path="/landing" element={<LandingPage />} />
                        <Route path="/inquiry-status/:inquiryNumber" element={<InquiryTracking />} />
                        <Route path="/login" element={<Login />} />

                        {/* Protected routes - with layout */}
                        <Route path="/" element={<ProtectedRoute><ClientHomeRedirect /></ProtectedRoute>} />
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
                        <Route path="/admin/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                        <Route path="/admin/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />

                        {/* Client Routes */}
                        <Route path="/payment/:proposalId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />

                        {/* Permission Testing - Development Only */}
                        <Route path="/test/permissions" element={<ProtectedRoute><PermissionTest /></ProtectedRoute>} />

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </React.Suspense>
                  </NotificationProvider>
                </AuthProvider>
              </BrowserRouter>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;

