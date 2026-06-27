import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, Lock, Mail, ChevronRight, HelpCircle } from "lucide-react";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await signIn(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in. Please check your credentials.");
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
        navigate("/onboarding", { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8" id="login-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2">
          <div className="bg-primary p-2 rounded text-white font-black text-lg font-mono tracking-tight shadow-sm">
            NL
          </div>
          <span className="text-xl font-bold text-primary font-sans tracking-tight">Nestlist</span>
        </div>
        <h2 className="mt-6 text-center text-xl font-black tracking-tight text-primary font-sans">
          Welcome back to Nestlist
        </h2>
        <p className="mt-2 text-center text-xs text-stone-500">
          Or{" "}
          <Link to="/signup" className="font-bold text-secondary hover:text-secondary-dark underline transition-colors" id="signup-link">
            create a new landlord or tenant account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-theme-line sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100" id="login-error-alert">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100">
              <AlertCircle size={14} className="shrink-0 text-emerald-600" />
              <span>Password reset email sent! Please check your inbox.</span>
            </div>
          )}

          {!showForgotPassword ? (
            <form className="space-y-6" onSubmit={handleSubmit} id="login-form">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Email address</label>
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
                    id="login-email-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-bold text-secondary hover:text-secondary-dark transition-colors"
                    id="forgot-password-btn"
                  >
                    Forgot password?
                  </button>
                </div>
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
                    placeholder="••••••••"
                    id="login-password-input"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-1 focus:ring-secondary transition-colors disabled:opacity-50 cursor-pointer"
                  id="login-submit-btn"
                >
                  {loading ? "Signing in..." : "Sign in to account"}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleForgotPassword} id="forgot-password-form">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Reset your password</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Enter your email address and we will send you a password reset link.
              </p>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Email address</label>
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
                    id="forgot-password-email"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                  }}
                  className="w-1/2 py-2.5 px-4 border border-theme-line rounded-lg text-xs font-bold text-stone-600 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                  id="forgot-password-cancel-btn"
                >
                  Back to login
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-colors disabled:opacity-50 cursor-pointer"
                  id="forgot-password-submit-btn"
                >
                  {loading ? "Sending..." : "Send link"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-theme-line"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-2 bg-white text-stone-400 font-extrabold uppercase tracking-widest">Or connect with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-theme-line rounded-lg shadow-sm text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-1 focus:ring-secondary transition-colors disabled:opacity-50 cursor-pointer"
                id="google-signin-btn"
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
