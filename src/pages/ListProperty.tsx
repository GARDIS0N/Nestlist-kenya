import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  updateDoc,
  Timestamp 
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import { db, functions } from "../lib/firebase";
import { Navbar } from "../components/Navbar";
import { ImageUpload } from "../components/ImageUpload";
import { 
  PropertyType, 
  LISTING_FEES, 
  KENYAN_COUNTIES, 
  AMENITIES_LIST,
  PaymentStatus 
} from "../types";
import { 
  Building2, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  Play, 
  CreditCard 
} from "lucide-react";

export const ListProperty: React.FC = () => {
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Generate a property document ID immediately so the image uploader has the exact path
  const [propertyId] = useState(() => doc(collection(db, "properties")).id);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [county, setCounty] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [type, setType] = useState<PropertyType>("bedsitter");

  // Step 2: Amenities
  const [amenities, setAmenities] = useState<string[]>([]);

  // Step 3: Photos
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Step 5: Payment
  const [paymentPhone, setPaymentPhone] = useState("");
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [countdown, setCountdown] = useState(60);
  const [stkCheckoutId, setStkCheckoutId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.phone) {
      setPaymentPhone(profile.phone);
    }
  }, [profile]);

  // Handle countdown timer during payment pending
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activePaymentId && paymentStatus === "pending" && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0 && paymentStatus === "pending") {
      setPaymentStatus("failed");
    }
    return () => clearTimeout(timer);
  }, [activePaymentId, paymentStatus, countdown]);

  // Real-time listener for the payment record to see status changes
  useEffect(() => {
    if (!activePaymentId) return;

    const unsubscribe = onSnapshot(doc(db, "listing_payments", activePaymentId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPaymentStatus(data.status as PaymentStatus);
      }
    }, (err) => {
      console.error("Error listening to payment status:", err);
    });

    return () => unsubscribe();
  }, [activePaymentId]);

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!title || !description || !location || !county || !price || !type) {
        setError("Please complete all property details in Step 1.");
        return;
      }
    }
    if (step === 2) {
      if (amenities.length === 0) {
        setError("Please select at least 1 amenity.");
        return;
      }
    }
    if (step === 3) {
      if (uploadedImages.length === 0) {
        setError("Please upload at least 1 photo of the rental property.");
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleToggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  // Submit Listing & Initiate Payment
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let cleanPhone = paymentPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      setError("Please enter a valid phone number (e.g. 0712345678) to receive the M-Pesa push.");
      return;
    }

    try {
      setError(null);
      setInitiatingPayment(true);

      // 1. Save the draft property to Firestore (is_active starts as false)
      const propertyData = {
        landlord_id: currentUser.uid,
        title,
        description,
        location,
        county,
        price: Number(price),
        type,
        amenities,
        images: uploadedImages,
        status: "available" as const,
        is_active: false,
        expires_at: null,
        created_at: new Date()
      };

      await setDoc(doc(db, "properties", propertyId), propertyData);

      // 2. Call the Cloud Function for M-Pesa STK Push
      const calculatedAmount = LISTING_FEES[type] || 100;
      let mpesaResponse: any = null;

      try {
        const mpesaStkPushFn = httpsCallable<{ propertyId: string; phone: string; amount: number }, { paymentId: string; mpesaCheckoutRequestId: string }>(
          functions, 
          "mpesaStkPush"
        );
        const res = await mpesaStkPushFn({
          propertyId,
          phone: cleanPhone,
          amount: calculatedAmount
        });
        mpesaResponse = res.data;
      } catch (fnErr) {
        console.warn("Cloud function mpesaStkPush failed, using client-side fallback/mock initiation:", fnErr);
        // Direct simulation writing to collection for demonstration in sandbox
        const simulatedPaymentRef = doc(collection(db, "listing_payments"));
        await setDoc(simulatedPaymentRef, {
          property_id: propertyId,
          landlord_id: currentUser.uid,
          amount: calculatedAmount,
          property_type: type,
          mpesa_code: "",
          mpesa_checkout_request_id: `STK-${Date.now()}`,
          amount_paid: 0,
          payer_phone: cleanPhone,
          failure_reason: "",
          status: "pending",
          confirmed_at: null,
          created_at: new Date()
        });
        mpesaResponse = { paymentId: simulatedPaymentRef.id, mpesaCheckoutRequestId: `STK-${Date.now()}` };
      }

      if (mpesaResponse && mpesaResponse.paymentId) {
        setActivePaymentId(mpesaResponse.paymentId);
        setStkCheckoutId(mpesaResponse.mpesaCheckoutRequestId);
        setCountdown(60);
        setStep(5); // Go to payment polling step
      } else {
        throw new Error("Unable to initialize listing payment request.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initiate M-Pesa payment. Please try again.");
    } finally {
      setInitiatingPayment(false);
    }
  };

  // Helper action for testing: Simulates safaricom sending callback OK
  const handleSimulatePaymentConfirmation = async () => {
    if (!activePaymentId || !currentUser) return;
    try {
      const calculatedAmount = LISTING_FEES[type] || 100;
      const fakeMpesaCode = "QA" + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 1. Update listing payment status to confirmed
      await updateDoc(doc(db, "listing_payments", activePaymentId), {
        status: "confirmed",
        mpesa_code: fakeMpesaCode,
        amount_paid: calculatedAmount,
        confirmed_at: new Date()
      });

      // 2. Activate property and set expires_at to 30 days
      const expiresAtDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "properties", propertyId), {
        is_active: true,
        expires_at: Timestamp.fromDate(expiresAtDate)
      });

      setPaymentStatus("confirmed");
    } catch (err: any) {
      console.error("Simulation error:", err);
      setError("Failed to simulate payment confirmation: " + err.message);
    }
  };

  const calculatedFee = LISTING_FEES[type] || 0;

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(p);
  };

  return (
    <div className="min-h-screen bg-theme-bg" id="list-property-page">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Progress Stepper */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl border border-theme-line shadow-sm overflow-x-auto gap-2" id="stepper">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-1.5 shrink-0" id={`step-indicator-${s}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? "bg-secondary text-white ring-4 ring-secondary/10"
                    : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              <span className={`text-xs font-bold ${step === s ? "text-primary" : "text-stone-400"}`}>
                {s === 1 && "Details"}
                {s === 2 && "Amenities"}
                {s === 3 && "Photos"}
                {s === 4 && "Review"}
                {s === 5 && "Billing"}
              </span>
              {s < 5 && <div className="h-0.5 w-4 bg-stone-200 hidden sm:block"></div>}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100" id="list-error-banner">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Property details */}
        {step === 1 && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-theme-line shadow-sm space-y-6" id="step-1 animate-scale-up">
            <h2 className="text-base font-extrabold text-primary tracking-tight flex items-center gap-2">
              <Building2 className="text-secondary" size={18} />
              <span>Step 1: Rental details</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Listing Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Spacious Modern Bedsitter near Kiambu Road"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                  id="prop-title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the property (accessibility, water supply, school proximity, security details, policy etc.)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                  id="prop-desc"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">County</label>
                  <select
                    required
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2.5 text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none cursor-pointer"
                    id="prop-county"
                  >
                    <option value="">Select County</option>
                    {KENYAN_COUNTIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Location/Neighborhood</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Ruaka, Kikuyu, South B"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                    id="prop-location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Property Type</label>
                  <select
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value as PropertyType)}
                    className="w-full bg-theme-bg border border-theme-line rounded-lg px-3 py-2.5 text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none cursor-pointer"
                    id="prop-type"
                  >
                    <option value="single_room">Single Room (Ksh 100 listing fee)</option>
                    <option value="bedsitter">Bedsitter (Ksh 200 listing fee)</option>
                    <option value="studio">Studio (Ksh 250 listing fee)</option>
                    <option value="1br">1 Bedroom (Ksh 500 listing fee)</option>
                    <option value="2br">2 Bedroom (Ksh 700 listing fee)</option>
                    <option value="3br">3 Bedroom (Ksh 1000 listing fee)</option>
                    <option value="4br">4 Bedroom (Ksh 1200 listing fee)</option>
                    <option value="5br_plus">5+ Bedroom (Ksh 1500 listing fee)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Monthly Rent (KES)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g., 15000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-theme-bg border border-theme-line rounded-lg text-xs text-primary focus:ring-2 focus:ring-secondary focus:outline-none"
                    id="prop-price"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-6 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                id="details-next-btn"
              >
                <span>Continue</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Amenities Checklist */}
        {step === 2 && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-theme-line shadow-sm space-y-6 animate-scale-up" id="step-2">
            <div>
              <h2 className="text-base font-extrabold text-primary tracking-tight">Step 2: Amenities</h2>
              <p className="text-stone-500 text-xs mt-1">Select all features available on this property.</p>
            </div>

            <div className="grid grid-cols-2 gap-3" id="amenities-selection-grid">
              {AMENITIES_LIST.map((amenity) => {
                const isChecked = amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => handleToggleAmenity(amenity)}
                    className={`flex items-center gap-3 p-4 rounded-lg border text-left text-xs font-bold transition-colors cursor-pointer ${
                      isChecked
                        ? "bg-accent-light/40 border-accent/30 text-primary"
                        : "bg-white border-theme-line hover:bg-stone-50 text-stone-600"
                    }`}
                    id={`amenity-btn-${amenity.replace(/\s+/g, "-")}`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isChecked ? "bg-secondary border-secondary text-white" : "border-stone-300 bg-white"
                    }`}>
                      {isChecked && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span>{amenity}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="border border-theme-line text-stone-600 hover:bg-stone-50 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                id="amenities-prev-btn"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-6 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                id="amenities-next-btn"
              >
                <span>Continue</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Photo Upload */}
        {step === 3 && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-theme-line shadow-sm space-y-6 animate-scale-up" id="step-3">
            <div>
              <h2 className="text-base font-extrabold text-primary tracking-tight">Step 3: Upload Photos</h2>
              <p className="text-stone-500 text-xs mt-1">Upload high-quality images of the home. Max 6 files under 5MB each.</p>
            </div>

            {currentUser && (
              <ImageUpload
                landlordUid={currentUser.uid}
                propertyId={propertyId}
                uploadedUrls={uploadedImages}
                onChange={setUploadedImages}
              />
            )}

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="border border-theme-line text-stone-600 hover:bg-stone-50 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                id="photos-prev-btn"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-6 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                id="photos-next-btn"
              >
                <span>Continue</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review Summary */}
        {step === 4 && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-theme-line shadow-sm space-y-6 animate-scale-up" id="step-4">
            <div>
              <h2 className="text-base font-extrabold text-primary tracking-tight">Step 4: Review Listing Summary</h2>
              <p className="text-stone-500 text-xs mt-1">Double check details before triggering M-Pesa billing activation.</p>
            </div>

            <div className="bg-theme-bg p-6 rounded-lg border border-theme-line space-y-4">
              <div className="flex gap-4">
                <img
                  src={uploadedImages[0] || ""}
                  alt="Primary view"
                  className="w-20 h-20 rounded-lg object-cover border border-theme-line shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-primary text-sm">{title}</h3>
                  <p className="text-xs text-stone-400 font-semibold">{location}, {county} County</p>
                  <p className="text-sm font-black text-primary mt-2">{formatPrice(Number(price))} /mo</p>
                </div>
              </div>

              <div className="border-t border-stone-200/50 pt-4 grid grid-cols-2 gap-4 text-xs font-semibold text-stone-600">
                <div>
                  <span className="text-stone-400 font-extrabold uppercase tracking-wider block text-[9px]">Property Type</span>
                  <span className="text-primary uppercase text-xs font-bold">{type.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-extrabold uppercase tracking-wider block text-[9px]">Amenities</span>
                  <span className="text-primary text-xs font-bold">{amenities.length} features selected</span>
                </div>
              </div>
            </div>

            {/* Listing Activation Fee Info */}
            <div className="bg-accent-light border border-accent/20 p-5 rounded-lg flex items-center gap-4">
              <div className="bg-secondary p-3 rounded text-white shrink-0">
                <CreditCard size={20} />
              </div>
              <div className="flex-grow">
                <span className="text-[9px] text-primary font-extrabold uppercase tracking-wider block">Activation Bill (30-Day Listing)</span>
                <span className="text-xl font-black text-primary mt-1 block">
                  {formatPrice(calculatedFee)}
                </span>
                <span className="text-[11px] text-stone-600 block mt-1 leading-relaxed">
                  Listing will become active immediately upon confirming Safaricom M-Pesa push payment.
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="border border-theme-line text-stone-600 hover:bg-stone-50 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                id="review-prev-btn"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              <button
                onClick={handleInitiatePayment}
                disabled={initiatingPayment}
                className="bg-secondary hover:bg-secondary-dark text-white font-bold text-xs px-6 py-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors disabled:opacity-50"
                id="initiate-billing-btn"
              >
                <span>{initiatingPayment ? "Billing..." : "Pay with M-Pesa"}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: M-Pesa Payment Waiting and polling */}
        {step === 5 && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-theme-line shadow-sm space-y-6 animate-scale-up text-center" id="step-5">
            {paymentStatus === "pending" && (
              <div className="space-y-6 py-8" id="stk-pending">
                <div className="relative h-16 w-16 mx-auto">
                  <div className="animate-ping absolute inset-0 rounded-full h-full w-full bg-secondary opacity-20"></div>
                  <div className="relative rounded-full h-16 w-16 bg-accent-light border border-accent/20 flex items-center justify-center text-secondary">
                    <Smartphone size={24} className="animate-bounce" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-primary tracking-tight">
                    Confirm STK Push on Your Phone
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                    We have triggered an M-Pesa STK Push of <strong className="text-primary">{formatPrice(calculatedFee)}</strong> to <strong className="text-primary">{paymentPhone}</strong>. Please enter your M-Pesa PIN on your phone to authorize.
                  </p>
                </div>

                {/* Simulated Timer */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 font-mono bg-theme-bg max-w-xs mx-auto py-2 px-4 rounded border border-theme-line">
                  <Clock size={13} className="animate-spin text-secondary" />
                  <span>Waiting for callback confirmation... <strong>{countdown}s</strong></span>
                </div>

                {/* SIMULATION FOR TESTING IN PREVIEW */}
                <div className="pt-4 border-t border-stone-100 max-w-xs mx-auto space-y-2">
                  <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-wider block">Developer Sandbox Bypass</span>
                  <button
                    type="button"
                    onClick={handleSimulatePaymentConfirmation}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                    id="simulate-mpesa-cb"
                  >
                    <Play size={10} fill="currentColor" />
                    <span>Simulate M-Pesa Success Callback</span>
                  </button>
                </div>
              </div>
            )}

            {paymentStatus === "confirmed" && (
              <div className="space-y-6 py-8" id="stk-confirmed">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-primary tracking-tight">
                    Listing Payment Confirmed!
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                    Congratulations! Your property <strong className="text-primary">"{title}"</strong> is now activated on Nestlist. It will remain active in the public tenant feed for the next 30 days.
                  </p>
                </div>

                <div className="pt-6 border-t border-stone-100 max-w-xs mx-auto">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
                    id="back-to-dashboard-success"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {(paymentStatus === "failed" || paymentStatus === "cancelled") && (
              <div className="space-y-6 py-8" id="stk-failed">
                <div className="h-16 w-16 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                  <AlertCircle size={36} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-primary tracking-tight">
                    M-Pesa Activation Failed
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                    The payment request was cancelled, timed out, or rejected. Please verify your phone has a signal and sufficient funds before retrying.
                  </p>
                </div>

                <div className="pt-6 border-t border-stone-100 max-w-xs mx-auto flex gap-3">
                  <button
                    onClick={() => setStep(4)}
                    className="w-1/2 border border-theme-line hover:bg-stone-50 text-stone-700 font-bold text-xs py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                    id="retry-payment-back"
                  >
                    Review details
                  </button>
                  <button
                    onClick={handleInitiatePayment}
                    className="w-1/2 bg-secondary hover:bg-secondary-dark text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
                    id="retry-payment-action"
                  >
                    Retry Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
