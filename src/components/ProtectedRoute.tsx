import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ requireSetup = true }: { requireSetup?: boolean }) {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !appUser) {
    return <Navigate to="/login" replace />;
  }

  if (appUser.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-slate-600">Your account has been blocked from accessing the library system. Please contact the administrator.</p>
        </div>
      </div>
    );
  }

  if (requireSetup && !appUser.isSetupComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!requireSetup && appUser.isSetupComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
