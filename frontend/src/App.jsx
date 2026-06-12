import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { AlertProvider, AlertContext } from './context/AlertContext';
import { useFraudAlerts } from './hooks/useFraudAlerts';
import { RefreshCw } from 'lucide-react';

// Import Page Views
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Alerts from './pages/Alerts';
import AlertDetail from './pages/AlertDetail';
import AccountDetails from './pages/AccountDetails';
import GraphView from './pages/GraphView';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import TransactionSimulator from './pages/TransactionSimulator';

// Import Custom Core Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { ToastProvider } from './components/ToastNotification';


// Guard for protected routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-xs text-muted">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Synchronizing security credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guard for public auth pages
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-xs text-muted">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Validating active session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Top Header / Navigation Layout Wrapper
const DashboardLayout = () => {
  return (
    <div className="flex h-screen bg-bg text-text-primary">
      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar />

        {/* Dynamic Route Content Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AlertProvider>
            <Routes>
              {/* Public Authentication Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />

              {/* Protected Console Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="graph" element={<GraphView />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="alerts/:id" element={<AlertDetail />} />
                <Route path="accounts/:accountId" element={<AccountDetails />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="simulator" element={<TransactionSimulator />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Fallback Catch */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AlertProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
