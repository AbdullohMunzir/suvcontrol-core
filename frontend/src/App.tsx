import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import SuperadminLayout from './layouts/SuperadminLayout';
import TenantLayout from './layouts/TenantLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TwaProtectedRoute from './components/TwaProtectedRoute';
import Addresses from './pages/app/Addresses';
import AbonentCard from './pages/app/AbonentCard';
import AbonentDetails from './pages/app/AbonentDetails';
import Collectors from './pages/app/Collectors';
import Billing from './pages/app/Billing';
import Collections from './pages/app/Collections';
import Dashboard from './pages/app/Dashboard';
import LegalEntities from './pages/app/LegalEntities';
import Payments from './pages/app/Payments';
import Reports from './pages/app/Reports';
import { SmsQueue } from './pages/app/SmsQueue';
import { SmsReport } from './pages/superadmin/SmsReport';
import SADashboard from './pages/superadmin/SADashboard';
import Tenants from './pages/superadmin/Tenants';
import AdminNotifications from './pages/superadmin/AdminNotifications';
import SaaSPayments from './pages/superadmin/SaaSPayments';
import Tariffs from './pages/superadmin/Tariffs';
import AuditLogs from './pages/superadmin/AuditLogs';
import SuperadminAbonents from './pages/superadmin/SuperadminAbonents';

// TWA imports
import TwaLayout from './pages/twa/TwaLayout';
import TwaDashboard from './pages/twa/TwaDashboard';
import TwaInvoices from './pages/twa/TwaInvoices';
import TwaPayments from './pages/twa/TwaPayments';
import TwaMeters from './pages/twa/TwaMeters';

import PageTitleUpdater from './components/PageTitleUpdater';
import NotFound from './pages/NotFound';

// Collector TWA imports removed
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Xatolik yuz berdi</h1>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            {this.state.error?.message || 'Noma\'lum xatolik'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            className="px-6 py-3 bg-teal-700 text-white rounded-lg hover:bg-teal-800 text-lg"
          >
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'SUPERADMIN') return <Navigate to="/superadmin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
};

import { useIdleTimer } from './hooks/useIdleTimer';

const IdleTimerWrapper = () => {
  useIdleTimer();
  return null;
};

import { LanguageProvider } from './contexts/LanguageContext';
import { ConfigProvider } from 'antd';

const enterpriseTheme = {
  token: {
    colorPrimary: '#0284c7',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#0284c7',
    colorTextBase: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    borderRadius: 8,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      fontWeight: 500,
      defaultBorderColor: '#e2e8f0',
      defaultColor: '#334155',
    },
    Table: {
      borderRadius: 8,
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSplitColor: '#e2e8f0',
      rowHoverBg: '#f8fafc',
      borderColor: '#f1f5f9',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 38,
      colorBorder: '#e2e8f0',
    },
    Select: {
      borderRadius: 8,
      controlHeight: 38,
      colorBorder: '#e2e8f0',
    },
    DatePicker: {
      borderRadius: 8,
      controlHeight: 38,
      colorBorder: '#e2e8f0',
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Card: {
      borderRadiusLG: 10,
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ConfigProvider theme={enterpriseTheme}>
        <AuthProvider>
          <LanguageProvider>
            <BrowserRouter>
              <PageTitleUpdater />
              <IdleTimerWrapper />
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />

          {/* Superadmin Routes */}
          <Route 
            path="/superadmin" 
            element={
              <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                <SuperadminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<SADashboard />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="saas-payments" element={<SaaSPayments />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="sms-report" element={<SmsReport />} />
            <Route path="tariffs" element={<Tariffs />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="abonents" element={<SuperadminAbonents />} />
          </Route>

          {/* Tenant Routes */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute allowedRoles={['TENANT', 'OPERATOR', 'SUPERADMIN']}>
                <TenantLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="abonent-card" element={<AbonentCard />} />
            <Route path="abonents/:id" element={<AbonentDetails />} />
            <Route path="abonent/:id" element={<AbonentDetails />} />
            <Route path="collectors" element={<Collectors />} />
            <Route path="legal-entities" element={<LegalEntities />} />
            <Route path="collections" element={<Collections />} />
            <Route path="billing" element={<Billing />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="sms" element={<SmsQueue />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>


          {/* TWA Routes (No AuthContext Required) */}
          <Route path="/twa" element={<TwaProtectedRoute><TwaLayout /></TwaProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TwaDashboard />} />
            <Route path="invoices" element={<TwaInvoices />} />
            <Route path="payments" element={<TwaPayments />} />
            <Route path="meters" element={<TwaMeters />} />
          </Route>


          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </AuthProvider>
</ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;
