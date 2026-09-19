import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getMenuPath } from "./AdminLayout";
import BootSplash from "./BootSplash";

const ProtectedRoute = ({ children, allowedRoles, requiredLoginAs }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <BootSplash />;

  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate to={getMenuPath(user.role, user.loginAs)} replace />
    );
  }

  // ── loginAs guard — prevent parent accessing /student/* and vice versa
  if (requiredLoginAs && user.loginAs !== requiredLoginAs) {
    return (
      <Navigate to={getMenuPath(user.role, user.loginAs)} replace />
    );
  }

  return children;
};

export default ProtectedRoute;
