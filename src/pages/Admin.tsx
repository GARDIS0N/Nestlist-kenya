import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  Timestamp,
  orderBy 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { Property, ListingPayment, UserProfile } from "../types";
import { 
  ShieldAlert, 
  Users, 
  Building, 
  DollarSign, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle 
} from "lucide-react";

export const Admin: React.FC = () => {
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<ListingPayment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "listings" | "users">("payments");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isAdmin = currentUser?.email === "thesilentwhisper.ke@gmail.com";

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [currentUser, loading, navigate]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // 1. Fetch properties
      const propsSnap = await getDocs(query(collection(db, "properties"), orderBy("created_at", "desc")));
      const fetchedProps: Property[] = [];
      propsSnap.forEach((d) => fetchedProps.push({ id: d.id, ...d.data() } as Property));
      setProperties(fetchedProps);

      // 2. Fetch payments
      const paymentsSnap = await getDocs(query(collection(db, "listing_payments"), orderBy("created_at", "desc")));
      const fetchedPayments: ListingPayment[] = [];
      paymentsSnap.forEach((d) => fetchedPayments.push({ id: d.id, ...d.data() } as ListingPayment));
      setPayments(fetchedPayments);

      // 3. Fetch users
      const usersSnap = await getDocs(query(collection(db, "profiles"), orderBy("created_at", "desc")));
      const fetchedUsers: UserProfile[] = [];
      usersSnap.forEach((d) => fetchedUsers.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(fetchedUsers);

    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [currentUser]);

  // Admin action: Manually confirm a pending payment
  const handleConfirmPayment = async (payment: ListingPayment) => {
    try {
      setActionLoadingId(payment.id);

      const fakeMpesaCode = "MAN" + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 1. Update status to confirmed
      await updateDoc(doc(db, "listing_payments", payment.id), {
        status: "confirmed",
        mpesa_code: fakeMpesaCode,
        amount_paid: payment.amount,
        confirmed_at: new Date()
      });

      // 2. Update properties is_active to true and set expires_at
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "properties", payment.property_id), {
        is_active: true,
        expires_at: Timestamp.fromDate(expiresAt)
      });

      // Refresh locally
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: "confirmed", mpesa_code: fakeMpesaCode, amount_paid: p.amount, confirmed_at: Timestamp.fromDate(new Date()) }
            : p
        )
      );
      setProperties((prev) =>
        prev.map((pr) =>
          pr.id === payment.property_id
            ? { ...pr, is_active: true, expires_at: Timestamp.fromDate(expiresAt) }
            : pr
        )
      );

    } catch (err) {
      console.error("Error manually confirming payment:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin action: Toggle properties active/inactive manually
  const handleToggleListingActive = async (propertyId: string, currentStatus: boolean) => {
    try {
      setActionLoadingId(propertyId);
      const updatedStatus = !currentStatus;

      const expiresAt = updatedStatus ? Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null;

      await updateDoc(doc(db, "properties", propertyId), {
        is_active: updatedStatus,
        expires_at: expiresAt
      });

      setProperties((prev) =>
        prev.map((p) => (p.id === propertyId ? { ...p, is_active: updatedStatus, expires_at: expiresAt } : p))
      );
    } catch (err) {
      console.error("Error toggling property active status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
        <div className="bg-white p-8 max-w-md w-full border border-theme-line rounded-xl text-center space-y-4 shadow-sm">
          <ShieldAlert size={48} className="mx-auto text-red-500" />
          <h3 className="text-lg font-black text-primary tracking-tight">Access Denied</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            You do not have administrative privileges to access the Nestlist backoffice control panel.
          </p>
          <Link to="/" className="inline-block bg-secondary hover:bg-secondary-dark text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm">
            Return to Browse Rentals
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(p);
  };

  return (
    <div className="min-h-screen bg-theme-bg" id="admin-panel-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-secondary" />
              <span>Nestlist Administration</span>
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Manual transaction overrides, active properties feed control, and user profiles.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="inline-flex bg-white border border-theme-line text-stone-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm items-center gap-1.5 cursor-pointer hover:bg-stone-50"
            id="admin-refresh-btn"
          >
            <RefreshCw size={12} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-theme-line mb-6 gap-6" id="admin-tabs">
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "payments"
                ? "border-secondary text-primary"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
            id="admin-tab-payments"
          >
            Pending Payments ({payments.filter(p => p.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("listings")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "listings"
                ? "border-secondary text-primary"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
            id="admin-tab-listings"
          >
            All Listings ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "border-secondary text-primary"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
            id="admin-tab-users"
          >
            Registered Users ({users.length})
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-theme-line rounded-xl">
            <div className="animate-spin rounded h-8 w-8 border-t-2 border-b-2 border-secondary mb-4"></div>
            <p className="text-stone-500 text-xs font-semibold">Fetching administrative logs...</p>
          </div>
        ) : (
          <div className="bg-white border border-theme-line rounded-xl shadow-sm overflow-hidden" id="admin-table-container">
            
            {/* PAYMENTS PANEL */}
            {activeTab === "payments" && (
              <div className="overflow-x-auto" id="admin-payments-table">
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs">No payment records found.</div>
                ) : (
                  <table className="min-w-full divide-y divide-theme-line text-left text-xs">
                    <thead className="bg-stone-50 font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Payer Phone</th>
                        <th className="px-6 py-4">Property ID</th>
                        <th className="px-6 py-4">Amount (KES)</th>
                        <th className="px-6 py-4">M-Pesa Code / Checkout ID</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 font-mono">{p.payer_phone}</td>
                          <td className="px-6 py-4 font-mono select-all truncate max-w-[120px]" title={p.property_id}>
                            {p.property_id}
                          </td>
                          <td className="px-6 py-4 font-bold">{formatPrice(p.amount)}</td>
                          <td className="px-6 py-4 font-mono text-[10px]">
                            {p.mpesa_code || p.mpesa_checkout_request_id}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded text-[9px] font-extrabold uppercase ${
                              p.status === "confirmed" 
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                : p.status === "pending"
                                ? "bg-accent-light text-secondary border border-accent/25"
                                : "bg-red-50 text-red-800"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.status === "pending" && (
                              <button
                                onClick={() => handleConfirmPayment(p)}
                                disabled={actionLoadingId === p.id}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                                id={`manual-confirm-btn-${p.id}`}
                              >
                                <Check size={12} />
                                <span>{actionLoadingId === p.id ? "Confirming..." : "Confirm Manually"}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* LISTINGS PANEL */}
            {activeTab === "listings" && (
              <div className="overflow-x-auto" id="admin-listings-table">
                {properties.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs">No properties found.</div>
                ) : (
                  <table className="min-w-full divide-y divide-theme-line text-left text-xs">
                    <thead className="bg-stone-50 font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Image</th>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">County / Location</th>
                        <th className="px-6 py-4">Rent</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Visibility</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                      {properties.map((prop) => (
                        <tr key={prop.id}>
                          <td className="px-6 py-4">
                            <img
                              src={prop.images[0] || ""}
                              alt=""
                              className="h-10 w-16 object-cover rounded border border-theme-line"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold max-w-[200px] truncate">{prop.title}</td>
                          <td className="px-6 py-4">{prop.location}, {prop.county}</td>
                          <td className="px-6 py-4 font-bold">{formatPrice(prop.price)}</td>
                          <td className="px-6 py-4 uppercase font-mono text-[10px]">{prop.type.replace("_", " ")}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleListingActive(prop.id, prop.is_active)}
                              disabled={actionLoadingId === prop.id}
                              className={`px-3 py-1.5 rounded font-bold text-[10px] cursor-pointer transition-all ${
                                prop.is_active
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                  : "bg-theme-bg border border-theme-line text-stone-500"
                              }`}
                              id={`toggle-visibility-${prop.id}`}
                            >
                              {actionLoadingId === prop.id 
                                ? "Toggling..." 
                                : prop.is_active 
                                ? "Deactivate (Visible)" 
                                : "Activate (Hidden)"
                              }
                            </button>
                          </td>
                          <td className="px-6 py-4 uppercase text-[10px] font-extrabold text-emerald-800">
                            {prop.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* USERS PANEL */}
            {activeTab === "users" && (
              <div className="overflow-x-auto" id="admin-users-table">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs">No users registered in Firestore profiles.</div>
                ) : (
                  <table className="min-w-full divide-y divide-theme-line text-left text-xs">
                    <thead className="bg-stone-50 font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Avatar</th>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Phone Number</th>
                        <th className="px-6 py-4">Registered Role</th>
                        <th className="px-6 py-4">Account UID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                      {users.map((u) => (
                        <tr key={u.uid}>
                          <td className="px-6 py-4">
                            <img
                              src={u.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                              alt=""
                              className="h-8 w-8 rounded-full border border-theme-line"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold">{u.full_name}</td>
                          <td className="px-6 py-4 font-mono">{u.phone || "N/A"}</td>
                          <td className="px-6 py-4 font-mono uppercase text-secondary tracking-wider font-extrabold text-[9px]">
                            {u.role || "Pending Onboarding"}
                          </td>
                          <td className="px-6 py-4 font-mono text-[10px] select-all">{u.uid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
