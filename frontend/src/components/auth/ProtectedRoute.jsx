import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthSession, getAuthUser, getDashboardRouteByRole, refreshAuthSession } from '../../services/authStorage';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 */

function ProtectedRoute({ children, allowedRoles, requirePasswordChange = false }) {
  const location = useLocation();
  const [authState, setAuthState] = useState(() => ({
    status: 'loading',
    user: getAuthUser()
  }));

  useEffect(() => {
    let isActive = true;

    const verifySession = async () => {
      try {
        const user = await refreshAuthSession();

        if (isActive) {
          setAuthState({ status: 'authenticated', user });
        }
      } catch {
        if (isActive) {
          clearAuthSession();
          setAuthState({ status: 'unauthenticated', user: null });
        }
      }
    };

    verifySession();

    return () => {
      isActive = false;
    };
  }, []);

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8 text-center">
        <div className="rounded-2xl bg-white px-6 py-5 shadow-lg">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  const user = authState.user;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedRole = user.role;
  const needsPasswordChange = Boolean(user.needsPasswordChange);

  if (needsPasswordChange && !requirePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (!needsPasswordChange && requirePasswordChange) {
    return <Navigate to={getDashboardRouteByRole(normalizedRole)} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    return (
      <div className="min-h-screen bg-yellow-50 p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-yellow-500">
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-4">You do not have permission to view this page.</p>
          <div className="bg-gray-100 p-4 rounded text-left mb-6 font-mono text-sm">
            <p>Your Role: {normalizedRole}</p>
            <p>Allowed Roles: {allowedRoles.join(', ')}</p>
          </div>
          <button
            onClick={() => window.location.href = getDashboardRouteByRole(normalizedRole)}
            className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 font-bold"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
