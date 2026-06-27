import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { AlertCircle, Phone, Users, Building2, Landmark } from "lucide-react";
import { UserRole } from "../types";

export const Onboarding: React.FC = () => {
  const { currentUser, profile, loading } = useAuth();
  const [role, setRole] = useState<UserRole | "">("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      if (profile.full_name) {
        setFullName(profile.full_name);
      }
      if (profile.phone) {
        setPhone(profile.phone);
      }
      if (profile.role) {
        setRole(profile.role);
      }
    }
  }, [profile, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError("You must be logged in.");
      return;
    }
    if (!role) {
      setError("Please select a profile role.");
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      setError("Please enter a valid phone number (e.g., 0712345678).");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      const profileRef = doc(db, "profiles", currentUser.uid);
      await updateDoc(profileRef, {
        full_name: fullName || currentUser.displayName || "User",
        phone: cleanPhone,
        role: role,
        created_at: new Date()
      });

      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="animate-spin rounded h-8 w-8 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8" id="onboarding-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-primary p-2 rounded text-white font-black text-lg font-mono shadow-sm">
            NL
          </div>
          <span className="text-xl font-bold text-primary">Nestlist</span>
        </div>
        <h2 className="text-xl font-black tracking-tight text-primary font-sans">
          Almost there!
        </h2>
        <p className="mt-2 text-xs text-stone-500">
          We need a few more details to set up your account profile.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-theme-line sm:rounded-xl">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100" id="onboarding-error">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" id="onboarding-form">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 bg-theme-bg border border-theme-line rounded-lg text-primary placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary text-xs"
                placeholder="e.g., John Kamau"
                id="onboarding-fullname"
              />
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Select your role:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("tenant")}
                  className={`flex flex-col items-center justify-center p-4 border rounded-lg text-center transition-all cursor-pointer ${
                    role === "tenant"
                      ? "border-secondary bg-accent-light/40 ring-1 ring-secondary text-primary font-bold"
                      : "border-theme-line bg-white hover:bg-stone-50 text-stone-500"
                  }`}
                  id="onboarding-tenant-btn"
                >
                  <Users className="h-5 w-5 mb-1 text-secondary" />
                  <span className="text-xs">Tenant</span>
                  <span className="text-[9px] text-stone-400 mt-0.5 font-normal">I am looking for a rental</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("landlord")}
                  className={`flex flex-col items-center justify-center p-4 border rounded-lg text-center transition-all cursor-pointer ${
                    role === "landlord"
                      ? "border-secondary bg-accent-light/40 ring-1 ring-secondary text-primary font-bold"
                      : "border-theme-line bg-white hover:bg-stone-50 text-stone-500"
                  }`}
                  id="onboarding-landlord-btn"
                >
                  <Building2 className="h-5 w-5 mb-1 text-secondary" />
                  <span className="text-xs">Landlord</span>
                  <span className="text-[9px] text-stone-400 mt-0.5 font-normal">I have properties to let</span>
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Kenyan Phone Number</label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Phone size={14} />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-theme-bg border border-theme-line rounded-lg text-primary placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary text-xs"
                  placeholder="e.g., 0712345678"
                  id="onboarding-phone"
                />
              </div>
              <p className="mt-1.5 text-[9px] text-stone-400">
                Crucial for receiving direct tenant inquiries or SMS alerts.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || !role}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-1 focus:ring-secondary transition-colors disabled:opacity-50 cursor-pointer"
                id="onboarding-submit-btn"
              >
                {submitting ? "Finishing up..." : "Complete Profile Setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
