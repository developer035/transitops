import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import BulkPopulate from './pages/BulkPopulate';
import UserManager from './pages/UserManager';
import { useAuth } from './context/AuthContext';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">{children}</main>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🚫</div>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <a href="/dashboard" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { role } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected routes — all roles can access dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Vehicles — not for drivers */}
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute allowedRoles={['fleet_manager', 'safety_officer', 'financial_analyst']}>
            <AppLayout><Vehicles /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Drivers — all roles but with different views */}
      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <AppLayout><Drivers /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Trips — all roles */}
      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <AppLayout><Trips /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Maintenance — not for drivers */}
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute allowedRoles={['fleet_manager', 'safety_officer', 'financial_analyst']}>
            <AppLayout><Maintenance /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Expenses — all roles (driver can add fuel, others view/CRUD) */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <AppLayout><Expenses /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Reports — not for drivers */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['fleet_manager', 'safety_officer', 'financial_analyst']}>
            <AppLayout><Reports /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Dev tools — no auth required */}
      <Route path="/bulk-populate" element={<BulkPopulate />} />
      <Route path="/user-manager" element={<UserManager />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
