import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { useEffect, useRef } from "react";
import { getMenuPath } from "./AdminLayout";
import BootSplash from "./BootSplash";

const ProtectedRoute = ({ children, allowedRoles, requiredLoginAs }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user && !hasShownToast.current) {
      hasShownToast.current = true;
    }

    if (
      user &&
      allowedRoles &&
      !allowedRoles.includes(user.role) &&
      !hasShownToast.current
    ) {
      toast.warn("Access denied: insufficient permissions");
      hasShownToast.current = true;
    }
  }, [user, loading, allowedRoles]);

  if (loading) return <BootSplash />;

  if (!user)
    return <Navigate to="/admin/login" state={{ from: location }} replace />;

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
