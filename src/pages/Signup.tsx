import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, Lock, Mail, User as UserIcon, Phone, Building2, Users } from "lucide-react";
import { UserRole } from "../types";

export const Signup: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email || !password || !role) {
      setError("Please fill out all required fields.");
      return;
    }

    // Basic phone validation for Kenyan numbers
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      setError("Please enter a valid phone number (e.g., 0712345678 or +254712345678).");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await signUp(email, password, fullName, cleanPhone, role);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Please check the information and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8" id="signup-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2">
          <div className="bg-primary p-2 rounded text-white font-black text-lg font-mono tracking-tight shadow-sm">
            NL
          </div>
          <span className="text-xl font-bold text-primary font-sans tracking-tight">Nestlist</span>
        </div>
        <h2 className="mt-6 text-center text-xl font-black tracking-tight text-primary font-sans">
          Create your Nestlist account
        </h2>
        <p className="mt-2 text-center text-xs text-stone-500">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-secondary hover:text-secondary-dark underline transition-colors" id="login-link">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-theme-line sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100" id="signup-error-alert">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} id="signup-form">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">I am signing up as a:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("tenant")}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg text-center transition-all cursor-pointer ${
                    role === "tenant"
                      ? "border-secondary bg-accent-light/40 ring-1 ring-secondary text-primary font-bold"
                      : "border-theme-line bg-white hover:bg-stone-50 text-stone-500"
                  }`}
                  id="tenant-role-btn"
                >
                  <Users className="h-4 w-4 mb-1 text-secondary" />
                  <span className="text-xs">Tenant</span>
                  <span className="text-[9px] text-stone-400 mt-0.5 font-normal">Searching for a home</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("landlord")}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg text-center transition-all cursor-pointer ${
                    role === "landlord"
                      ? "border-secondary bg-accent-light/40 ring-1 ring-secondary text-primary font-bold"
                      : "border-theme-line bg-white hover:bg-stone-50 text-stone-500"
                  }`}
                  id="landlord-role-btn"
                >
                  <Building2 className="h-4 w-4 mb-1 text-secondary" />
                  <span className="text-xs">Landlord</span>
                  <span className="text-[9px] text-stone-400 mt-0.5 font-normal font-sans">Rent out properties</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Full Name</label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <UserIcon size={14} />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-theme-bg border border-theme-line rounded-lg text-primary placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-secondary text-xs"
                  placeholder="e.g., John Kamau"
                  id="signup-fullname-input"
                />
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
                  className="block w-full pl-10 pr-3 py-2 bg-theme-bg border border-theme-line rounded-lg text-primary placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-secondary text-xs"
                  placeholder="e.g., 0712345678"
                  id="signup-phone-input"
                />
              </div>
              <p className="mt-1 text-[9px] text-stone-400">Required for receiving SMS alerts and inquiries.</p>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Email Address</label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail size={14} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-theme-bg border border-theme-line rounded-lg text-primary placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-secondary text-xs"
                  placeholder="you@example.com"
                  id="signup-email-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Password</label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={14} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-theme-bg border border-theme-line rounded-lg text-primary placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-secondary text-xs"
                  placeholder="At least 6 characters"
                  id="signup-password-input"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-1 focus:ring-secondary transition-colors disabled:opacity-50 cursor-pointer"
                id="signup-submit-btn"
              >
                {loading ? "Creating account..." : "Sign up and continue"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-theme-line"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-2 bg-white text-stone-400 font-extrabold uppercase tracking-widest">Or sign up with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-theme-line rounded-lg shadow-sm text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-1 focus:ring-secondary transition-colors disabled:opacity-50 cursor-pointer"
                id="google-signup-btn"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
