import { Routes, Route, Navigate } from 'react-router-dom';

import { AdminAuthProvider, useAdminAuth } from '../../contexts/AdminAuthContext';

import { AdminDashboard } from './AdminDashboard';
import { AdminGameView } from './AdminGameView';
import { AdminLogin } from './AdminLogin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function AdminRoutesInner() {
  const { isAuthenticated } = useAdminAuth();

  return (
    <Routes>
      <Route
        index
        element={isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />}
      />
      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="games/:code"
        element={
          <ProtectedRoute>
            <AdminGameView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <AdminRoutesInner />
    </AdminAuthProvider>
  );
}
