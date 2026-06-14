import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExplorerPage from './pages/Explorer';
import SetupPage from './pages/Setup';
import LoginPage from './pages/Login';
import UserManagement from './pages/UserManagement';
import SystemConfigManager from './pages/SystemConfigManager';
import DashboardOverview from './pages/DashboardOverview';
import AccountPage from './pages/Account';
import { Toaster } from 'react-hot-toast';
import { AuthGuard, SetupGuard, AdminGuard } from './components/AuthGuard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
        
        <Route element={<SetupGuard />}>
          <Route path="/setup" element={<SetupPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="explorer" element={<ExplorerPage />} />
            
            <Route element={<AdminGuard />}>
              <Route path="staff" element={<UserManagement />} />
              <Route path="platform" element={<SystemConfigManager />} />
            </Route>

            <Route path="account" element={<AccountPage />} />
            <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
};

export default App;

