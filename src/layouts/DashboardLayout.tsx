import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { LoadingState } from '../components/ui/EmptyState';
import { UserRole } from '../types';

interface DashboardLayoutProps {
  allowedRoles?: UserRole[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [safetyTimeoutTriggered, setSafetyTimeoutTriggered] = useState(false);

  // Global Fail-Safe: Force unblock after 1.2s max so layout never traps pages in infinite spinner
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setSafetyTimeoutTriggered(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const effectiveLoading = loading && !safetyTimeoutTriggered;

  if (effectiveLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Oturum ve yetki matrisi doğrulanıyor..." />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const effectiveRole = role === 'head_coach' ? 'coach' : (role || 'student');

  // If role is loaded and current route has role restrictions
  if (
    allowedRoles &&
    role &&
    !allowedRoles.includes(role) &&
    !allowedRoles.includes(effectiveRole as UserRole)
  ) {
    return <Navigate to={`/${effectiveRole}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <div className="flex-1 flex">
        <Sidebar
          role={effectiveRole as UserRole}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
