import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { SearchAlert, KENYAN_COUNTIES, AMENITIES_LIST, PropertyType } from "../types";
import { 
  Bell, 
  Plus, 
  Trash2, 
  X, 
  AlertCircle, 
  Check, 
  Sliders, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";

export const SearchAlerts: React.FC = () => {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Alert Modal State
  const [showModal, setShowModal] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [county, setCounty] = useState("");
  const [type, setType] = useState<PropertyType | "">("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch search alerts
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "search_alerts"),
      where("tenant_id", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedAlerts: SearchAlert[] = [];
      snap.forEach((docSnap) => {
        fetchedAlerts.push({ id: docSnap.id, ...docSnap.data() } as SearchAlert);
      });
      setAlerts(fetchedAlerts);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to search alerts:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "search_alerts", alertId), {
        is_active: !currentStatus
      });
    } catch (err) {
      console.error("Error toggling alert status:", err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteDoc(doc(db, "search_alerts", alertId));
    } catch (err) {
      console.error("Error deleting alert:", err);
    }
  };

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleCreateAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!alertName || !county || !type) {
      setError("Please fill out Name, County, and Property Type.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      const alertData = {
        tenant_id: currentUser.uid,
        name: alertName,
        county,
        type,
        min_price: minPrice === "" ? 0 : Number(minPrice),
        max_price: maxPrice === "" ? Infinity : Number(maxPrice),
        amenities: selectedAmenities,
        is_active: true,
        created_at: new Date()
      };

      await addDoc(collection(db, "search_alerts"), alertData);

      // Reset Form and Close
      setAlertName("");
      setCounty("");
      setType("");
      setMinPrice("");
      setMaxPrice("");
      setSelectedAmenities([]);
      setShowModal(false);
    } catch (err: any) {
      console.error("Error creating search alert:", err);
      setError(err.message || "Failed to create SMS search alert.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === Infinity) return "No max limit";
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-theme-bg" id="search-alerts-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
              SMS Search Alerts
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Set search filters to receive instant SMS alerts whenever new matching rentals are listed.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex bg-secondary hover:bg-secondary-dark text-white font-bold text-xs px-5 py-3 rounded-lg transition-colors shadow-sm items-center gap-1.5 cursor-pointer"
            id="create-alert-trigger"
          >
            <Plus size={14} />
            <span>New Alert</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-theme-line rounded-xl">
            <div className="animate-spin rounded h-8 w-8 border-t-2 border-b-2 border-secondary mb-4"></div>
            <p className="text-stone-500 text-xs font-semibold">Loading search alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white border border-theme-line rounded-xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm" id="alerts-empty-state">
            <Bell className="mx-auto h-12 w-12 text-stone-300" />
            <h3 className="text-base font-bold text-primary">Never miss a home</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              You haven't set up any SMS search alerts yet. Create an alert for your preferred counties and rental budget to receive instant text alerts when houses are posted.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
              id="empty-state-new-alert"
            >
              Create your first alert
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-scale-up" id="alerts-grid">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-xl border border-theme-line shadow-sm p-6 space-y-4 relative flex flex-col justify-between"
                id={`alert-card-${alert.id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-bold text-primary text-sm flex items-center gap-2">
                      <Bell size={16} className={alert.is_active ? "text-secondary" : "text-stone-300"} />
                      <span>{alert.name}</span>
                    </h3>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        alert.is_active ? "bg-secondary" : "bg-stone-200"
                      }`}
                      id={`toggle-alert-${alert.id}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          alert.is_active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-stone-600 bg-theme-bg p-3 rounded-lg border border-theme-line">
                    <div>
                      <span className="text-stone-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">County</span>
                      <span className="text-primary text-xs font-bold">{alert.county}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Type</span>
                      <span className="text-primary text-xs font-bold uppercase">{alert.type.replace("_", " ")}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-stone-200/50 mt-1">
                      <span className="text-stone-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Price Range</span>
                      <span className="text-primary text-xs font-bold">
                        {formatPrice(alert.min_price)} to {formatPrice(alert.max_price)}
                      </span>
                    </div>
                  </div>

                  {alert.amenities && alert.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {alert.amenities.map((amenity) => (
                        <span key={amenity} className="bg-theme-bg border border-theme-line text-stone-600 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-[10px] font-medium text-stone-400">
                  <span>
                    {alert.last_sent 
                      ? `Last notification sent: ${new Date(alert.last_sent.toDate()).toLocaleDateString()}`
                      : "No matches found yet"
                    }
                  </span>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Delete Alert"
                    id={`delete-alert-${alert.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto backdrop-blur-sm" id="create-alert-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-theme-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto my-8 animate-scale-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-950 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
              id="close-alert-modal"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-extrabold text-primary tracking-tight mb-2">
              Create New SMS Alert
            </h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Name this alert and configure your filters to receive automated phone SMS text messages.
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100" id="create-alert-error">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateAlertSubmit} className="space-y-4" id="create-alert-form">
              {/* Alert Name */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Alert Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 2 Bedroom Kiambu budget"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                  id="alert-name-input"
                />
              </div>

              {/* County & Type Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">County</label>
                  <div className="relative">
                    <select
                      required
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2.5 text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none appearance-none cursor-pointer"
                      id="alert-county-select"
                    >
                      <option value="">Select County</option>
                      {KENYAN_COUNTIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Property Type</label>
                  <div className="relative">
                    <select
                      required
                      value={type}
                      onChange={(e) => setType(e.target.value as PropertyType)}
                      className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2.5 text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none appearance-none cursor-pointer"
                      id="alert-type-select"
                    >
                      <option value="">Select Type</option>
                      <option value="single_room">Single Room</option>
                      <option value="bedsitter">Bedsitter</option>
                      <option value="studio">Studio</option>
                      <option value="1br">1 Bedroom</option>
                      <option value="2br">2 Bedroom</option>
                      <option value="3br">3 Bedroom</option>
                      <option value="4br">4 Bedroom</option>
                      <option value="5br_plus">5+ Bedroom</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Min Price (KES)</label>
                  <input
                    type="number"
                    placeholder="No minimum"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                    id="alert-min-price"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Max Price (KES)</label>
                  <input
                    type="number"
                    placeholder="No maximum"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                    id="alert-max-price"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Required Amenities</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-theme-line rounded-lg p-3 bg-theme-bg">
                  {AMENITIES_LIST.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => handleToggleAmenity(amenity)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded border text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-accent-light border-accent/30 text-primary font-bold"
                            : "bg-white border-theme-line text-stone-600 hover:bg-stone-50"
                        }`}
                        id={`alert-amenity-select-${amenity.replace(/\s+/g, "-")}`}
                      >
                        {isSelected && <Check size={11} className="shrink-0 text-primary" />}
                        <span className="truncate">{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 px-4 border border-theme-line rounded-lg text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                  id="cancel-create-alert"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-colors disabled:opacity-50 cursor-pointer"
                  id="submit-create-alert"
                >
                  {submitting ? "Creating..." : "Save Search Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
