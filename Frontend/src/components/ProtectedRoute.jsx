import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { useEffect, useRef } from "react";

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

  if (loading) return <div>Loading...</div>;

  if (!user)
    return <Navigate to="/admin/login" state={{ from: location }} replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "super_admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === "school_admin") {
      return <Navigate to="/school/dashboard" replace />;
    }
    if (user.role === "teacher_admin") {
      return <Navigate to="/teacher/dashboard" replace />;
    }
    if (user.role === "student_admin") {
      const dest =
        user.loginAs === "student" ? "/student/dashboard" : "/parent/dashboard";
      return <Navigate to={dest} replace />;
    }
    if (user.role === "staff_admin")
      return <Navigate to="/staff/dashboard" replace />;
  }

  // ── loginAs guard — prevent parent accessing /student/* and vice versa
  if (requiredLoginAs && user.loginAs !== requiredLoginAs) {
    const dest =
      user.loginAs === "student" ? "/student/dashboard" : "/parent/dashboard";
    return <Navigate to={dest} replace />;
  }
  
  return children;
};

export default ProtectedRoute;