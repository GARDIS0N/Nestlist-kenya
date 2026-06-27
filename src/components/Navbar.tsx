import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  Home, 
  Heart, 
  Bell, 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Building 
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { currentUser, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const isAdmin = profile?.role === "landlord" && currentUser?.email === "thesilentwhisper.ke@gmail.com"; // Hardcoded admin check

  return (
    <nav className="bg-white border-b border-theme-line sticky top-0 z-50 shadow-sm" id="main-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[72px]">
          {/* Logo & Brand */}
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2.5" id="nav-brand-link">
              <div className="bg-primary text-white font-extrabold text-sm w-8 h-8 rounded flex items-center justify-center font-mono tracking-tighter">
                NL
              </div>
              <span className="text-xl font-bold text-primary tracking-tight font-sans">
                Nestlist
              </span>
            </Link>

            {/* Desktop Links */}
            {profile && (
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                <Link
                  to="/"
                  className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-semibold transition-colors ${
                    isActive("/")
                      ? "border-secondary text-primary font-bold"
                      : "border-transparent text-stone-500 hover:text-stone-700 hover:border-theme-line"
                  }`}
                  id="nav-browse"
                >
                  <Home size={16} className="mr-1.5" />
                  Browse
                </Link>

                {profile.role === "tenant" && (
                  <>
                    <Link
                      to="/saved"
                      className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-semibold transition-colors ${
                        isActive("/saved")
                          ? "border-secondary text-primary font-bold"
                          : "border-transparent text-stone-500 hover:text-stone-700 hover:border-theme-line"
                      }`}
                      id="nav-saved"
                    >
                      <Heart size={16} className="mr-1.5" />
                      Saved
                    </Link>

                    <Link
                      to="/alerts"
                      className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-semibold transition-colors ${
                        isActive("/alerts")
                          ? "border-secondary text-primary font-bold"
                          : "border-transparent text-stone-500 hover:text-stone-700 hover:border-theme-line"
                      }`}
                      id="nav-alerts"
                    >
                      <Bell size={16} className="mr-1.5" />
                      Search Alerts
                    </Link>
                  </>
                )}

                {profile.role === "landlord" && (
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-semibold transition-colors ${
                      isActive("/dashboard")
                        ? "border-secondary text-primary font-bold"
                        : "border-transparent text-stone-500 hover:text-stone-700 hover:border-theme-line"
                    }`}
                    id="nav-dashboard"
                  >
                    <LayoutDashboard size={16} className="mr-1.5" />
                    Landlord Dashboard
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-semibold transition-colors ${
                      isActive("/admin")
                        ? "border-secondary text-primary font-bold"
                        : "border-transparent text-stone-500 hover:text-stone-700 hover:border-theme-line"
                    }`}
                    id="nav-admin"
                  >
                    <ShieldCheck size={16} className="mr-1.5" />
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* User Settings & Logout (Desktop) */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:gap-4">
            {profile && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-primary">{profile.full_name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-secondary font-bold font-mono">
                    {profile.role}
                  </div>
                </div>
                <img
                  src={profile.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                  alt="Avatar"
                  className="h-9 w-9 rounded-full object-cover border border-theme-line"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                  id="nav-signout-desktop"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 focus:outline-none transition-colors cursor-pointer"
              aria-expanded="false"
              id="mobile-menu-btn"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden bg-white border-b border-theme-line px-2 pt-2 pb-3 space-y-1 shadow-inner">
          {profile && (
            <div className="flex items-center gap-3 p-3 border-b border-stone-100 mb-2">
              <img
                src={profile.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover border border-theme-line"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="text-sm font-bold text-primary">{profile.full_name}</div>
                <div className="text-xs text-secondary uppercase tracking-wider font-bold font-mono">
                  {profile.role}
                </div>
              </div>
            </div>
          )}

          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive("/")
                ? "bg-accent-light text-primary font-bold"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
            id="mobile-nav-browse"
          >
            <Home size={18} className="mr-2.5 text-stone-400" />
            Browse Rentals
          </Link>

          {profile?.role === "tenant" && (
            <>
              <Link
                to="/saved"
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive("/saved")
                    ? "bg-accent-light text-primary font-bold"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
                id="mobile-nav-saved"
              >
                <Heart size={18} className="mr-2.5 text-stone-400" />
                Saved Homes
              </Link>

              <Link
                to="/alerts"
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive("/alerts")
                    ? "bg-accent-light text-primary font-bold"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
                id="mobile-nav-alerts"
              >
                <Bell size={18} className="mr-2.5 text-stone-400" />
                Search SMS Alerts
              </Link>
            </>
          )}

          {profile?.role === "landlord" && (
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive("/dashboard")
                  ? "bg-accent-light text-primary font-bold"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
              id="mobile-nav-dashboard"
            >
              <LayoutDashboard size={18} className="mr-2.5 text-stone-400" />
              Landlord Dashboard
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setIsOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive("/admin")
                  ? "bg-accent-light text-primary font-bold"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
              id="mobile-nav-admin"
            >
              <ShieldCheck size={18} className="mr-2.5 text-stone-400" />
              Admin Portal
            </Link>
          )}

          <button
            onClick={() => {
              setIsOpen(false);
              handleSignOut();
            }}
            className="w-full flex items-center px-3 py-2.5 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all cursor-pointer"
            id="mobile-nav-signout"
          >
            <LogOut size={18} className="mr-2.5" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};
