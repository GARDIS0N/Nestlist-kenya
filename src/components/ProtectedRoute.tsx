import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("landlord" | "tenant")[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded h-8 w-8 border-t-2 border-b-2 border-secondary"></div>
          <span className="text-stone-500 text-xs font-semibold">Verifying credentials...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasIncompleteProfile = !profile || !profile.role || !profile.phone;

  // Onboarding required (unless already on onboarding)
  if (hasIncompleteProfile && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding already done, trying to access onboarding
  if (!hasIncompleteProfile && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  // Allowed roles check
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // If tenant tries to access landlord panel or vice versa
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
