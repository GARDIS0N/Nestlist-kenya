import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { Property, Inquiry, InquiryMessage, UserProfile } from "../types";
import { 
  Building, 
  MessageSquare, 
  Plus, 
  CheckCircle, 
  Clock, 
  User as UserIcon, 
  Send, 
  AlertCircle, 
  ArrowUpRight,
  Eye
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "inquiries">("listings");

  // Conversation/Chat state
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedInquiryMessages, setSelectedInquiryMessages] = useState<InquiryMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [tenantProfiles, setTenantProfiles] = useState<Record<string, UserProfile>>({});
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});

  // 1. Fetch properties & inquiries for landlord
  useEffect(() => {
    if (!currentUser) return;

    // Real-time properties listener
    const qProps = query(
      collection(db, "properties"),
      where("landlord_id", "==", currentUser.uid),
      orderBy("created_at", "desc")
    );
    const unsubProps = onSnapshot(qProps, (snap) => {
      const fetched: Property[] = [];
      const map: Record<string, Property> = {};
      snap.forEach((docSnap) => {
        const prop = { id: docSnap.id, ...docSnap.data() } as Property;
        fetched.push(prop);
        map[prop.id] = prop;
      });
      setProperties(fetched);
      setPropertyMap(map);
    }, (err) => {
      console.error("Properties subscription error:", err);
    });

    // Real-time inquiries listener
    const qInq = query(
      collection(db, "inquiries"),
      where("landlord_id", "==", currentUser.uid),
      orderBy("created_at", "desc")
    );
    const unsubInq = onSnapshot(qInq, (snap) => {
      const fetched: Inquiry[] = [];
      snap.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as Inquiry);
      });
      setInquiries(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Inquiries subscription error:", err);
      setLoading(false);
    });

    return () => {
      unsubProps();
      unsubInq();
    };
  }, [currentUser]);

  // 2. Load profiles of tenants who made inquiries in parallel
  useEffect(() => {
    if (inquiries.length === 0) return;

    const uniqueTenantIds: string[] = Array.from(new Set(inquiries.map((inq) => inq.tenant_id)));
    const fetchTenantProfiles = async () => {
      const updatedProfiles = { ...tenantProfiles };
      const missingTenantIds = uniqueTenantIds.filter((tId) => !updatedProfiles[tId]);

      if (missingTenantIds.length === 0) return;

      const promises = missingTenantIds.map(async (tId) => {
        const docSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "==", tId)));
        if (!docSnap.empty) {
          const profileData = { uid: tId, ...docSnap.docs[0].data() } as UserProfile;
          updatedProfiles[tId] = profileData;
        }
      });

      await Promise.all(promises);
      setTenantProfiles(updatedProfiles);
    };

    fetchTenantProfiles();
  }, [inquiries]);

  // 3. Real-time chat messages subscription
  useEffect(() => {
    if (!selectedInquiry) {
      setSelectedInquiryMessages([]);
      return;
    }

    const qMessages = query(
      collection(db, "inquiries", selectedInquiry.id, "messages"),
      orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(qMessages, (snap) => {
      const fetchedMsgs: InquiryMessage[] = [];
      snap.forEach((docSnap) => {
        fetchedMsgs.push({ id: docSnap.id, ...docSnap.data() } as InquiryMessage);
      });
      setSelectedInquiryMessages(fetchedMsgs);
    }, (err) => {
      console.error("Error loading messages:", err);
    });

    return () => unsubscribe();
  }, [selectedInquiry]);

  // Landlord reply action
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedInquiry || !replyText.trim()) return;

    try {
      setSendingReply(true);
      // 1. Add to messages subcollection
      await addDoc(collection(db, "inquiries", selectedInquiry.id, "messages"), {
        sender_id: currentUser.uid,
        content: replyText.trim(),
        created_at: new Date()
      });

      // 2. Update inquiry status to "responded"
      await updateDoc(doc(db, "inquiries", selectedInquiry.id), {
        status: "responded"
      });

      setReplyText("");
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  // Toggle status of property (available/taken)
  const handleToggleStatus = async (propertyId: string, currentStatus: "available" | "taken") => {
    try {
      await updateDoc(doc(db, "properties", propertyId), {
        status: currentStatus === "available" ? "taken" : "available"
      });
    } catch (err) {
      console.error("Error toggling property availability:", err);
    }
  };

  // Stats calculations
  const totalProperties = properties.length;
  const activeListings = properties.filter((p) => p.is_active).length;
  const totalInquiries = inquiries.length;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-theme-bg" id="dashboard-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
              Landlord Dashboard
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Manage listings, monitor inquiry requests, and track payments.
            </p>
          </div>
          <Link
            to="/list-property"
            className="inline-flex bg-secondary hover:bg-secondary-dark text-white font-bold text-xs px-5 py-3 rounded-lg transition-colors shadow-sm items-center gap-1.5 cursor-pointer"
            id="list-property-trigger"
          >
            <Plus size={14} />
            <span>List Property</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8" id="stats-container">
          <div className="bg-white p-6 rounded-xl border border-theme-line shadow-sm flex items-center gap-4">
            <div className="bg-accent-light p-3 rounded text-primary">
              <Building size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider block">Active Listings</span>
              <span className="text-xl font-black text-primary block mt-0.5">{activeListings}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-theme-line shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded text-blue-700">
              <MessageSquare size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider block">Total Inquiries</span>
              <span className="text-xl font-black text-primary block mt-0.5">{totalInquiries}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-theme-line shadow-sm flex items-center gap-4">
            <div className="bg-emerald-50 p-3 rounded text-emerald-700">
              <CheckCircle size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider block">Total Properties</span>
              <span className="text-xl font-black text-primary block mt-0.5">{totalProperties}</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-theme-line mb-6 flex justify-between items-center">
          <div className="flex space-x-6" id="dashboard-tabs">
            <button
              onClick={() => setActiveTab("listings")}
              className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "listings"
                  ? "border-secondary text-primary"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
              id="tab-listings-btn"
            >
              My Listings ({totalProperties})
            </button>
            <button
              onClick={() => setActiveTab("inquiries")}
              className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "inquiries"
                  ? "border-secondary text-primary"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
              id="tab-inquiries-btn"
            >
              Inquiries Received ({totalInquiries})
            </button>
          </div>
        </div>

        {/* Main Sections */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-theme-line rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mb-4"></div>
            <p className="text-stone-500 text-xs font-semibold">Fetching your landlord account stats...</p>
          </div>
        ) : activeTab === "listings" ? (
          properties.length === 0 ? (
            <div className="bg-white border border-theme-line rounded-xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm" id="listings-empty-state">
              <Building className="mx-auto h-12 w-12 text-stone-300" />
              <h3 className="text-base font-bold text-primary">No properties listed yet</h3>
              <p className="text-stone-500 text-xs leading-relaxed">
                Activate your portfolio! Post single rooms, bedsitters, studios, or houses, and activate them using secure Safaricom M-Pesa STK push listing fees.
              </p>
              <Link to="/list-property" className="inline-block bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer">
                List first property
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-scale-up" id="landlord-properties-list">
              {properties.map((prop) => (
                <div key={prop.id} className="bg-white rounded-xl border border-theme-line overflow-hidden shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow relative" id={`dashboard-property-card-${prop.id}`}>
                  {/* Image */}
                  <img
                    src={prop.images[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=200"}
                    alt={prop.title}
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-lg object-cover border border-theme-line bg-theme-bg shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  {/* Property Info */}
                  <div className="flex flex-col justify-between flex-grow min-w-0">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono border ${
                          prop.is_active 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                            : "bg-accent-light border-accent/20 text-primary"
                        }`}>
                          {prop.is_active ? "Active" : "Pending Activation"}
                        </span>
                        <span className="bg-theme-bg text-stone-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono border border-theme-line">
                          {prop.type.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="font-bold text-primary text-sm sm:text-base truncate mt-1">{prop.title}</h3>
                      <p className="text-xs text-stone-400 font-semibold truncate">{prop.location}, {prop.county}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                      <span className="text-sm font-black text-primary">
                        {formatPrice(prop.price)}
                      </span>

                      {/* Availability Toggle */}
                      <button
                        onClick={() => handleToggleStatus(prop.id, prop.status)}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                          prop.status === "available"
                            ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
                            : "bg-theme-bg hover:bg-stone-100 border-theme-line text-stone-600"
                        }`}
                        id={`toggle-availability-${prop.id}`}
                      >
                        {prop.status === "available" ? "Mark as Taken" : "Mark as Available"}
                      </button>
                    </div>
                  </div>

                  {/* View Details Anchor icon */}
                  <Link
                    to={`/property/${prop.id}`}
                    className="absolute top-4 right-4 text-stone-400 hover:text-primary transition-colors"
                    title="View Public Page"
                    id={`view-detail-link-${prop.id}`}
                  >
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : inquiries.length === 0 ? (
          <div className="bg-white border border-theme-line rounded-xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm" id="inquiries-empty-state">
            <MessageSquare className="mx-auto h-12 w-12 text-stone-300" />
            <h3 className="text-base font-bold text-primary">No inquiries yet</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Inquiries from verified tenants browsing your listed properties will appear here. They will trigger instant SMS notifications to your phone!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scale-up" id="landlord-inquiries-area">
            {/* List of Inquiries (Left 1 Col) */}
            <div className="lg:col-span-1 space-y-3">
              {inquiries.map((inq) => {
                const tenant = tenantProfiles[inq.tenant_id];
                const associatedProp = propertyMap[inq.property_id];
                const isSelected = selectedInquiry?.id === inq.id;

                return (
                  <button
                    key={inq.id}
                    onClick={() => setSelectedInquiry(inq)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 relative cursor-pointer ${
                      isSelected
                        ? "bg-accent-light border-secondary ring-1 ring-secondary"
                        : "bg-white border-theme-line hover:bg-stone-50 shadow-sm"
                    }`}
                    id={`inquiry-btn-${inq.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={tenant?.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=Tenant"}
                        alt="Tenant"
                        className="h-8 w-8 rounded-full border border-theme-line object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-grow">
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="font-bold text-primary text-xs truncate">
                            {tenant?.full_name || "Verified Tenant"}
                          </h4>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono ${
                            inq.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : inq.status === "responded"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                              : "bg-stone-100 text-stone-500"
                          }`}>
                            {inq.status}
                          </span>
                        </div>
                        <p className="text-[9px] text-stone-400 font-mono mt-0.5">{tenant?.phone || "No phone"}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-500 mt-1 line-clamp-2 bg-theme-bg p-2 rounded border border-theme-line">
                      <strong className="text-primary">Property:</strong> {associatedProp?.title || "Rental listing"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conversation Window (Right 2 Cols) */}
            <div className="lg:col-span-2">
              {selectedInquiry ? (
                <div className="bg-white rounded-xl border border-theme-line shadow-sm flex flex-col h-[550px]" id="chat-window">
                  {/* Header */}
                  <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={tenantProfiles[selectedInquiry.tenant_id]?.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=Tenant"}
                        alt="Tenant"
                        className="h-10 w-10 rounded-full border border-theme-line object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-bold text-primary text-xs">
                          {tenantProfiles[selectedInquiry.tenant_id]?.full_name || "Verified Tenant"}
                        </h4>
                        <p className="text-[10px] text-stone-400 font-mono">
                          {tenantProfiles[selectedInquiry.tenant_id]?.phone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] text-stone-400 font-extrabold block uppercase font-mono">Inquiry Property</span>
                      <span className="text-xs font-bold text-primary truncate block max-w-[200px]">
                        {propertyMap[selectedInquiry.property_id]?.title || "Property"}
                      </span>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-theme-bg shadow-inner">
                    {selectedInquiryMessages.map((msg) => {
                      const isLandlordSender = msg.sender_id === currentUser.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isLandlordSender ? "justify-end" : "justify-start"}`}
                          id={`msg-${msg.id}`}
                        >
                          <div className={`max-w-md rounded-lg p-3.5 text-xs font-medium shadow-sm border ${
                            isLandlordSender
                              ? "bg-secondary border-secondary-dark text-white rounded-tr-none"
                              : "bg-white border-theme-line text-primary rounded-tl-none"
                          }`}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[8px] mt-1.5 block text-right font-mono ${
                              isLandlordSender ? "text-white/80" : "text-stone-400"
                            }`}>
                              {msg.created_at ? new Date(msg.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Sent"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="p-3 border-t border-stone-100 bg-white flex gap-2 rounded-b-xl">
                    <input
                      type="text"
                      required
                      placeholder="Type your reply to the tenant here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-grow px-4 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs focus:ring-1 focus:ring-secondary focus:outline-none"
                      id="chat-reply-input"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="bg-secondary hover:bg-secondary-dark text-white px-4 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                      id="chat-send-reply-btn"
                    >
                      <Send size={12} />
                      <span>Reply</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white border border-theme-line rounded-xl h-[550px] flex flex-col items-center justify-center p-6 text-center text-stone-400 space-y-3 shadow-sm">
                  <MessageSquare size={32} className="text-stone-300" />
                  <h4 className="text-xs font-bold text-primary">No conversation selected</h4>
                  <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                    Select an inquiry from the left column to view the chat history and reply to the tenant in real time.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
