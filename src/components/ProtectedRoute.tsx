import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type UserRole = 'owner' | 'admin' | 'agent' | 'user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/login',
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      console.log('[ProtectedRoute] No user, redirecting to login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user as AppUser & { role?: UserRole }).role || 'user';
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
};

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: UserRole;
}