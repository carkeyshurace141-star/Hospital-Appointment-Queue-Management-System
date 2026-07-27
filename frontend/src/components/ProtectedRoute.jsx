import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeRouteForRole } from '../utils/roles';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <span
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600 dark:border-stone-700 dark:border-t-teal-400"
        />
        <p className="ml-3 text-stone-600 dark:text-stone-400">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={homeRouteForRole(user?.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
