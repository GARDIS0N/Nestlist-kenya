import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { Property, KENYAN_COUNTIES, PropertyType } from "../types";
import { 
  Search, 
  MapPin, 
  Heart, 
  SlidersHorizontal, 
  ChevronDown, 
  X, 
  Building2,
  TrendingUp,
  Sparkles,
  Plus
} from "lucide-react";

export const Browse: React.FC = () => {
  const { currentUser, profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [type, setType] = useState<PropertyType | "">("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [showFilters, setShowFilters] = useState(false);

  // Saved Properties Map
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  // 1. Listen for saved properties
  useEffect(() => {
    if (!currentUser || profile?.role !== "tenant") return;

    const q = query(
      collection(db, "saved_properties"), 
      where("tenant_id", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const map: Record<string, boolean> = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.property_id) {
          map[data.property_id] = true;
        }
      });
      setSavedMap(map);
    }, (error) => {
      console.error("Error listening to saved properties:", error);
    });

    return () => unsubscribe();
  }, [currentUser, profile]);

  // 2. Load Properties (with filters)
  const fetchProperties = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Base query: only active properties
      let q = query(
        collection(db, "properties"),
        where("is_active", "==", true),
        orderBy("created_at", "desc")
      );

      // Fetch constraints
      const fetchLimit = 20;
      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc), limit(fetchLimit));
      } else {
        q = query(q, limit(fetchLimit));
      }

      const snap = await getDocs(q);
      const fetchedProps: Property[] = [];
      snap.forEach((docSnap) => {
        fetchedProps.push({ id: docSnap.id, ...docSnap.data() } as Property);
      });

      if (isLoadMore) {
        setProperties((prev) => [...prev, ...fetchedProps]);
      } else {
        setProperties(fetchedProps);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === fetchLimit);
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProperties(false);
  }, []);

  // Handle Save/Unsave Favorite
  const handleToggleSave = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) return;
    const compositeId = `${currentUser.uid}_${propertyId}`;
    const docRef = doc(db, "saved_properties", compositeId);

    try {
      if (savedMap[propertyId]) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          tenant_id: currentUser.uid,
          property_id: propertyId,
          created_at: new Date()
        });
      }
    } catch (err) {
      console.error("Error saving property:", err);
    }
  };

  // Client-side filtering to support instant query, since Firebase inequalities are highly constrained
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch = 
      prop.title.toLowerCase().includes(search.toLowerCase()) ||
      prop.location.toLowerCase().includes(search.toLowerCase()) ||
      prop.description.toLowerCase().includes(search.toLowerCase());

    const matchesCounty = !county || prop.county === county;
    const matchesType = !type || prop.type === type;
    const matchesMinPrice = minPrice === "" || prop.price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || prop.price <= Number(maxPrice);

    return matchesSearch && matchesCounty && matchesType && matchesMinPrice && matchesMaxPrice;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(price);
  };

  const clearFilters = () => {
    setSearch("");
    setCounty("");
    setType("");
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <div className="min-h-screen bg-theme-bg" id="browse-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="lg:grid lg:grid-cols-[260px_1fr_280px] lg:gap-8 items-start">
          
          {/* 1. Left Sidebar: Filters */}
          <div className={`${showFilters ? "block" : "hidden"} lg:block bg-white p-5 rounded-xl border border-theme-line shadow-sm space-y-6 shrink-0`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary flex items-center gap-2 text-sm">
                <SlidersHorizontal size={15} />
                <span>Filters</span>
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="lg:hidden text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* County */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">County</label>
              <div className="relative">
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-secondary focus:outline-none appearance-none"
                  id="county-filter"
                >
                  <option value="">All Counties</option>
                  {KENYAN_COUNTIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Type</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PropertyType)}
                  className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-secondary focus:outline-none appearance-none"
                  id="type-filter"
                >
                  <option value="">All Types</option>
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

            {/* Price Range */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Price Range (KES)</label>
              <div>
                <input
                  type="number"
                  placeholder="Min price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                  id="min-price-filter"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                  id="max-price-filter"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex gap-2">
              <button
                onClick={clearFilters}
                className="w-full bg-stone-50 hover:bg-stone-100 border border-theme-line text-stone-600 hover:text-stone-900 text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer text-center"
                id="clear-filters-btn"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* 2. Middle Main Column: Search Bar & Results */}
          <div className="flex-grow space-y-6 mt-6 lg:mt-0">
            {/* Search Top Input */}
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by neighborhood, town, estate or keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-theme-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary text-primary placeholder-stone-400 font-sans shadow-sm"
                  id="search-input"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center justify-center p-3 rounded-xl border border-theme-line bg-white text-stone-700 hover:bg-stone-50 shrink-0 cursor-pointer"
                title="Filters"
              >
                <SlidersHorizontal size={20} />
              </button>

              <button
                onClick={() => fetchProperties(false)}
                className="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer font-sans shadow-sm shrink-0"
                id="refresh-btn"
              >
                Refresh
              </button>
            </div>

            {/* Results Title Banner */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-primary tracking-tight font-sans">
                  Available Rental Homes
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Showing {filteredProperties.length} active listings across Kenya
                </p>
              </div>
            </div>

            {/* Listings Section */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white border border-theme-line rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mb-4"></div>
                <p className="text-stone-500 text-xs font-semibold font-sans">Fetching premium rental properties...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="bg-white border border-theme-line rounded-xl p-12 text-center space-y-4 shadow-sm" id="empty-state">
                <Building2 className="mx-auto h-12 w-12 text-stone-300" />
                <h3 className="text-base font-bold text-primary">No rental listings found</h3>
                <p className="text-stone-500 text-xs max-w-sm mx-auto leading-relaxed">
                  We couldn't find any listings matching your search. Try widening your criteria or resetting the filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-2 text-secondary font-bold hover:text-secondary-dark transition-colors text-xs underline"
                  id="empty-state-clear"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-scale-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" id="property-grid">
                  {filteredProperties.map((prop) => (
                    <Link
                      key={prop.id}
                      to={`/property/${prop.id}`}
                      className="bg-white rounded-xl border border-theme-line overflow-hidden shadow-sm hover:shadow-md hover:border-secondary/40 transition-all flex flex-col group relative"
                      id={`property-card-${prop.id}`}
                    >
                      {/* Image Container */}
                      <div className="relative aspect-video bg-stone-100 overflow-hidden">
                        <img
                          src={prop.images[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800"}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />

                        {/* Property Type Badge */}
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-primary text-[10px] font-extrabold px-2.5 py-1 rounded border border-theme-line uppercase tracking-wider font-mono shadow-sm">
                          {prop.type.replace("_", " ")}
                        </div>

                        {/* Tenant Heart Button */}
                        {profile?.role === "tenant" && (
                          <button
                            onClick={(e) => handleToggleSave(e, prop.id)}
                            className={`absolute top-3 right-3 p-2 rounded-full transition-all cursor-pointer shadow-sm border ${
                              savedMap[prop.id]
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-white/90 hover:bg-white text-stone-600 border-theme-line"
                            }`}
                            id={`save-btn-${prop.id}`}
                          >
                            <Heart size={14} fill={savedMap[prop.id] ? "currentColor" : "none"} />
                          </button>
                        )}
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

                {/* Load More Trigger */}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => fetchProperties(true)}
                      disabled={loadingMore}
                      className="bg-white border border-theme-line text-stone-700 hover:bg-stone-50 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      id="load-more-btn"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-stone-500"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <span>Load more listings</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Right Sidebar: Market Stats & Landlord Banner */}
          <div className="hidden lg:flex flex-col gap-6 w-[280px] shrink-0 sticky top-24">
            {/* Quick Actions Panel */}
            {profile?.role === "landlord" && (
              <div className="bg-white p-5 rounded-xl border border-theme-line shadow-sm space-y-4">
                <h4 className="font-bold text-xs text-primary flex items-center gap-2">
                  <Sparkles size={16} className="text-accent" />
                  <span>Landlord Portal</span>
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  List high-demand rentals across major urban zones in Kiambu, Nairobi and Mombasa.
                </p>
                <Link
                  to="/list-property"
                  className="w-full flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary-dark text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  <span>List New Property</span>
                </Link>
              </div>
            )}

            {/* Market Stats Panel */}
            <div className="bg-white p-5 rounded-xl border border-theme-line shadow-sm space-y-4">
              <h4 className="font-bold text-xs text-primary flex items-center gap-2 border-b border-stone-100 pb-2">
                <TrendingUp size={16} className="text-secondary" />
                <span>Market Insights</span>
              </h4>
              
              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-mono">Platform Listings</div>
                  <div className="text-lg font-extrabold text-primary">{properties.length} Active</div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-mono">Listing Fee</div>
                  <div className="text-sm font-bold text-secondary">KSh 500 / 30 Days</div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-mono">Popular Regions</div>
                  <div className="text-[11px] font-semibold text-primary mt-1 flex flex-wrap gap-1.5">
                    <span className="bg-stone-50 px-2 py-0.5 rounded border border-theme-line">Nairobi</span>
                    <span className="bg-stone-50 px-2 py-0.5 rounded border border-theme-line">Kiambu</span>
                    <span className="bg-stone-50 px-2 py-0.5 rounded border border-theme-line">Mombasa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* M-Pesa Banner */}
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider font-mono">M-Pesa Instant</span>
              </div>
              <h4 className="font-bold text-sm text-emerald-950">Landlord Verification</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Nestlist landlord listings are instantly verified and published for 30 days upon automatic KSh 500 STK push receipt.
              </p>
              <div className="bg-white/85 p-2 rounded border border-emerald-100 text-[10px] font-mono text-emerald-900">
                🚀 Faster tenant connection
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
