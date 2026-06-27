import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { Property, UserProfile } from "../types";
import { 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Building, 
  MessageSquare, 
  Phone, 
  Send, 
  X, 
  AlertCircle 
} from "lucide-react";

export const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Inquiry Modal State
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState(
    "Hello, I am interested in this rental property and would like to schedule a viewing. Please contact me."
  );
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Fetch property
        const propRef = doc(db, "properties", id);
        const propSnap = await getDoc(propRef);

        if (!propSnap.exists()) {
          setProperty(null);
          setLoading(false);
          return;
        }

        const propData = { id: propSnap.id, ...propSnap.data() } as Property;
        setProperty(propData);

        // Fetch landlord profile
        const landlordRef = doc(db, "profiles", propData.landlord_id);
        const landlordSnap = await getDoc(landlordRef);
        if (landlordSnap.exists()) {
          setLandlordProfile({ uid: propData.landlord_id, ...landlordSnap.data() } as UserProfile);
        }
      } catch (err) {
        console.error("Error fetching property details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !property) return;

    try {
      setInquiryLoading(true);
      setInquiryError(null);

      // 1. Create inquiry in parent collection
      const inquiryData = {
        property_id: property.id,
        tenant_id: currentUser.uid,
        landlord_id: property.landlord_id,
        message: inquiryMessage,
        status: "pending",
        created_at: new Date()
      };

      const inquiryRef = await addDoc(collection(db, "inquiries"), inquiryData);

      // 2. Add first message to messages subcollection
      await addDoc(collection(db, "inquiries", inquiryRef.id, "messages"), {
        sender_id: currentUser.uid,
        content: inquiryMessage,
        created_at: new Date()
      });

      setInquirySuccess(true);
      setTimeout(() => {
        setShowInquiryModal(false);
        setInquirySuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error("Error creating inquiry:", err);
      setInquiryError(err.message || "Failed to submit your inquiry. Please try again.");
    } finally {
      setInquiryLoading(false);
    }
  };

  const nextImage = () => {
    if (!property) return;
    setActiveImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    if (!property) return;
    setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <div className="animate-spin rounded h-8 w-8 border-t-2 border-b-2 border-secondary mb-4"></div>
          <p className="text-stone-500 text-xs font-semibold">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <Navbar />
        <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="text-lg font-bold text-primary">Property not found</h3>
          <p className="text-stone-500 text-xs leading-relaxed">
            The property listing you are trying to view does not exist or may have expired and been taken down.
          </p>
          <Link to="/" className="inline-flex bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-sm">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg" id="property-detail-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center text-stone-500 hover:text-stone-900 text-xs font-bold mb-6 gap-1 transition-colors" id="back-to-browse">
          <ChevronLeft size={14} />
          <span>Back to Browse</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images and Info */}
          <div className="lg:col-span-2 space-y-8 animate-scale-up">
            {/* Gallery */}
            <div className="bg-primary-dark rounded-2xl overflow-hidden relative aspect-video shadow-sm group">
              <img
                src={property.images[activeImageIndex] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200"}
                alt={property.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {property.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/55 hover:bg-black/75 text-white rounded-full transition-colors cursor-pointer"
                    id="prev-img-btn"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/55 hover:bg-black/75 text-white rounded-full transition-colors cursor-pointer"
                    id="next-img-btn"
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                    {property.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          idx === activeImageIndex ? "bg-accent scale-110" : "bg-white/50"
                        }`}
                        id={`indicator-dot-${idx}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* General Info */}
            <div className="bg-white p-6 rounded-xl border border-theme-line shadow-sm space-y-6">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <span className="bg-accent-light text-primary border border-accent/20 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase font-mono">
                    {property.type.replace("_", " ")}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase font-mono">
                    {property.status}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
                  {property.title}
                </h1>
                <p className="text-stone-500 flex items-center gap-1.5 text-xs">
                  <MapPin size={14} className="text-secondary shrink-0" />
                  <span>{property.location}, {property.county} County</span>
                </p>
              </div>

              <div className="pt-6 border-t border-stone-100 space-y-3">
                <h3 className="text-sm font-bold text-primary">About this property</h3>
                <p className="text-stone-600 text-xs leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </div>

              {/* Amenities */}
              <div className="pt-6 border-t border-stone-100 space-y-4">
                <h3 className="text-sm font-bold text-primary">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 p-3 bg-theme-bg border border-theme-line rounded-lg" id={`amenity-item-${amenity.replace(/\s+/g, "-")}`}>
                      <div className="bg-secondary text-white rounded-full p-0.5 shrink-0">
                        <Check size={10} />
                      </div>
                      <span className="text-xs font-semibold text-stone-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sidebar / Sticky Panel */}
          <div className="space-y-6">
            {/* Price & Primary Inquiry Card */}
            <div className="bg-white p-6 rounded-xl border border-theme-line shadow-sm space-y-6">
              <div className="pb-4 border-b border-stone-100">
                <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider block">Listing price</span>
                <span className="text-2xl font-black text-primary block mt-1">
                  {formatPrice(property.price)}
                  <span className="text-xs text-stone-400 font-medium">/month</span>
                </span>
              </div>

              {profile?.role === "tenant" ? (
                <button
                  onClick={() => setShowInquiryModal(true)}
                  className="w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  id="inquire-btn"
                >
                  <MessageSquare size={14} />
                  <span>Inquire about property</span>
                </button>
              ) : profile?.role === "landlord" ? (
                <div className="p-3 bg-theme-bg border border-theme-line text-stone-600 rounded-lg text-xs text-center font-semibold leading-relaxed">
                  You are listing this property. Access your inquiries in the dashboard.
                </div>
              ) : (
                <Link
                  to="/login"
                  className="w-full bg-primary hover:bg-primary-dark text-white text-center font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                  id="login-to-inquire-btn"
                >
                  <span>Sign in to inquire</span>
                </Link>
              )}
            </div>

            {/* Landlord Card */}
            {landlordProfile && (
              <div className="bg-white p-6 rounded-xl border border-theme-line shadow-sm space-y-4">
                <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider block">Listed by Landlord</span>
                <div className="flex items-center gap-3">
                  <img
                    src={landlordProfile.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=Landlord"}
                    alt={landlordProfile.full_name}
                    className="h-10 w-10 rounded-full object-cover border border-theme-line"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-primary">{landlordProfile.full_name}</h4>
                    <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-1">
                      <Phone size={10} className="text-secondary" />
                      <span>{landlordProfile.phone}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" id="inquiry-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-theme-line shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => setShowInquiryModal(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-950 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
              id="close-inquiry-modal"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-extrabold text-primary tracking-tight mb-2">
              Send Inquiry to Landlord
            </h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              You are sending an inquiry for "{property.title}". The landlord will receive an SMS alert with your name and phone number.
            </p>

            {inquiryError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100" id="inquiry-error-alert">
                <AlertCircle size={14} className="shrink-0" />
                <span>{inquiryError}</span>
              </div>
            )}

            {inquirySuccess ? (
              <div className="py-8 text-center space-y-3" id="inquiry-success">
                <div className="bg-emerald-100 text-emerald-800 rounded-full h-10 w-10 flex items-center justify-center mx-auto text-sm font-bold">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-primary">Inquiry Sent Successfully!</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Landlord has been notified via SMS. Check your messages.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-4" id="inquiry-form">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Inquiry Message</label>
                  <textarea
                    required
                    rows={4}
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    className="w-full p-3 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:outline-none focus:ring-2 focus:ring-secondary"
                    placeholder="Enter your message here..."
                    id="inquiry-message-textarea"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInquiryModal(false)}
                    className="w-1/2 py-2.5 px-4 border border-theme-line rounded-lg text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                    id="cancel-inquiry-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inquiryLoading}
                    className="w-1/2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    id="submit-inquiry-btn"
                  >
                    <Send size={12} />
                    <span>{inquiryLoading ? "Sending..." : "Send Inquiry"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
