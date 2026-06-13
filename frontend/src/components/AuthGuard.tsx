import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSetupStatus, useMe } from '../hooks/useAuth';

export const AuthGuard: React.FC = () => {
  const { data: setupData, isLoading: setupLoading } = useSetupStatus();
  const { data: meData, isLoading: meLoading, error } = useMe();
  const location = useLocation();

  if (setupLoading || meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (setupData?.setup_required) {
    return <Navigate to="/setup" replace />;
  }

  if (error || !meData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const SetupGuard: React.FC = () => {
  const { data: setupData, isLoading } = useSetupStatus();

  if (isLoading) {
    return null;
  }

  if (!setupData?.setup_required) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
