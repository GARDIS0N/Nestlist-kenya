/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Onboarding } from "./pages/Onboarding";
import { Browse } from "./pages/Browse";
import { PropertyDetail } from "./pages/PropertyDetail";
import { SavedProperties } from "./pages/SavedProperties";
import { SearchAlerts } from "./pages/SearchAlerts";
import { Dashboard } from "./pages/Dashboard";
import { ListProperty } from "./pages/ListProperty";
import { Admin } from "./pages/Admin";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Onboarding Flow (Requires Authenticated Profile, but unfinished) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Main Tenant / Browse / Search Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Browse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/property/:id"
            element={
              <ProtectedRoute>
                <PropertyDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute allowedRoles={["tenant"]}>
                <SavedProperties />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute allowedRoles={["tenant"]}>
                <SearchAlerts />
              </ProtectedRoute>
            }
          />

          {/* Landlord Specific Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["landlord"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/list-property"
            element={
              <ProtectedRoute allowedRoles={["landlord"]}>
                <ListProperty />
              </ProtectedRoute>
            }
          />

          {/* Admin Backoffice Control */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["landlord"]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

