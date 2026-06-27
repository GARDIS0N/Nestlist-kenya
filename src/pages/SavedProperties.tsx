import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  deleteDoc 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { Property } from "../types";
import { Heart, MapPin, Building2, ChevronLeft, Trash2 } from "lucide-react";

export const SavedProperties: React.FC = () => {
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedProperties = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      // 1. Fetch saved references
      const q = query(
        collection(db, "saved_properties"),
        where("tenant_id", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      
      const propertyIds: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.property_id) {
          propertyIds.push(data.property_id);
        }
      });

      if (propertyIds.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }

      // 2. Fetch properties in parallel
      const propertyPromises = propertyIds.map(async (pId) => {
        const propSnap = await getDoc(doc(db, "properties", pId));
        if (propSnap.exists()) {
          return { id: propSnap.id, ...propSnap.data() } as Property;
        }
        return null;
      });

      const resolved = await Promise.all(propertyPromises);
      const validProperties = resolved.filter((p): p is Property => p !== null);
      setProperties(validProperties);
    } catch (err) {
      console.error("Error loading saved properties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedProperties();
  }, [currentUser]);

  const handleRemoveSave = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return;

    const compositeId = `${currentUser.uid}_${propertyId}`;
    try {
      await deleteDoc(doc(db, "saved_properties", compositeId));
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      console.error("Error removing saved property:", err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-theme-bg" id="saved-properties-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
              Saved Properties
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Properties you have bookmarked for future reference.
            </p>
          </div>
          <Link to="/" className="inline-flex items-center text-secondary hover:text-secondary-dark text-xs font-bold gap-1 transition-colors">
            <ChevronLeft size={14} />
            <span>Back to Browse</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-theme-line rounded-xl">
            <div className="animate-spin rounded h-8 w-8 border-t-2 border-b-2 border-secondary mb-4"></div>
            <p className="text-stone-500 text-xs font-semibold">Loading your bookmarked homes...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white border border-theme-line rounded-xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm" id="saved-empty-state">
            <Heart className="mx-auto h-12 w-12 text-stone-300" />
            <h3 className="text-base font-bold text-primary">Your list is empty</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              You haven't saved any property listings yet. Click the heart icon on any card to bookmark a rental and view it here later.
            </p>
            <Link to="/" className="inline-block bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer">
              Start browsing rentals
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-scale-up" id="saved-grid">
            {properties.map((prop) => (
              <Link
                key={prop.id}
                to={`/property/${prop.id}`}
                className="bg-white rounded-xl border border-theme-line overflow-hidden shadow-sm hover:shadow-md hover:border-secondary/40 transition-all flex flex-col group relative"
                id={`saved-card-${prop.id}`}
              >
                {/* Image Container */}
                <div className="relative aspect-video bg-stone-100 overflow-hidden">
                  <img
                    src={prop.images[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800"}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-primary text-[10px] font-extrabold px-2.5 py-1 rounded border border-theme-line uppercase tracking-wider font-mono shadow-sm">
                    {prop.type.replace("_", " ")}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleRemoveSave(e, prop.id)}
                    className="absolute top-3 right-3 p-1.5 bg-white hover:bg-red-50 text-stone-600 hover:text-red-600 rounded-full transition-all cursor-pointer shadow-sm border border-theme-line"
                    id={`remove-save-${prop.id}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Body details */}
                <div className="p-4 flex flex-col flex-grow justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-primary line-clamp-1 mb-1 group-hover:text-secondary transition-colors">
                      {prop.title}
                    </h4>
                    <p className="text-xs text-stone-500 flex items-center gap-1 mb-3">
                      <MapPin size={11} className="text-secondary shrink-0" />
                      <span className="truncate">{prop.location}, {prop.county}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-sm font-black text-primary">
                      {formatPrice(prop.price)}
                      <span className="text-[10px] text-stone-400 font-medium">/mo</span>
                    </span>
                    <span className="text-[9px] font-bold text-secondary bg-accent-light px-2 py-0.5 rounded border border-accent/20 uppercase tracking-wider font-mono">
                      {prop.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
