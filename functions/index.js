const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// =========================================================================
// SMS UTILITY & TEMPLATES
// =========================================================================

const SMS_TEMPLATES = {
  inquiry_received: (data) => 
    `Hi ${data.landlordName}, you have received a new inquiry for "${data.propertyTitle}" from ${data.tenantName}. Phone: ${data.tenantPhone}. Message: "${data.message}" - Nestlist`,
  
  inquiry_sent: (data) => 
    `Hi ${data.tenantName}, your inquiry for "${data.propertyTitle}" has been sent to the landlord. They will contact you shortly. Thank you - Nestlist`,
  
  payment_confirmed: (data) => 
    `Payment Confirmed! Received KSh ${data.amount} for your listing "${data.propertyTitle}". It is now active for 30 days. - Nestlist`,
  
  listing_expiring: (data) => 
    `Hi ${data.landlordName}, your listing "${data.propertyTitle}" is expiring in ${data.daysRemaining} days. Renew now to keep receiving tenants. - Nestlist`,
  
  listing_expired: (data) => 
    `Hi ${data.landlordName}, your listing "${data.propertyTitle}" has expired. Please renew your payment to reactivate it. - Nestlist`,
  
  search_alert: (data) => 
    `New Match! A new ${data.propertyType} in ${data.propertyCounty} matching your search alert is available for KSh ${data.propertyPrice}. View now! - Nestlist`,
  
  welcome_landlord: (data) => 
    `Welcome to Nestlist, ${data.name}! Start listing your properties today. Active listings cost as low as KSh 100/mo. - Nestlist`,
  
  welcome_tenant: (data) => 
    `Welcome to Nestlist, ${data.name}! Search and find your next rental across Kenya. Save favorites and get instant SMS alerts. - Nestlist`
};

/**
 * Sends an SMS using Africa's Talking API and logs to firestore sms_logs.
 */
async function sendSmsViaAT(type, recipientPhone, templateData) {
  const username = process.env.AFRICASTALKING_USERNAME || "sandbox";
  const apiKey = process.env.AFRICASTALKING_API_KEY || "dummy_api_key";
  const senderId = process.env.AFRICASTALKING_FROM || "NESTLIST";

  const templateFn = SMS_TEMPLATES[type];
  if (!templateFn) {
    console.error(`Invalid SMS template type: ${type}`);
    return;
  }

  const messageText = templateFn(templateData);

  // Format phone to E.164 (+254xxxxxxxx)
  let formattedPhone = recipientPhone.replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "+254" + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith("254") && !formattedPhone.startsWith("+")) {
    formattedPhone = "+" + formattedPhone;
  } else if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+254" + formattedPhone;
  }

  let status = "failed";
  let messageId = "N/A";
  let cost = "Ksh 0";

  console.log(`Sending SMS to ${formattedPhone}: "${messageText}"`);

  if (username !== "sandbox" && apiKey !== "dummy_api_key") {
    try {
      const qs = require("querystring");
      const res = await axios.post(
        "https://api.africastalking.com/version1/messaging",
        qs.stringify({
          username,
          to: formattedPhone,
          message: messageText,
          from: senderId === "NESTLIST" ? undefined : senderId // Sandbox cannot use custom alpha alphanumeric senderIDs unless registered
        }),
        {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "apiKey": apiKey
          }
        }
      );

      const recipientData = res.data.SMSMessageData.Recipients[0];
      if (recipientData && (recipientData.status === "Success" || recipientData.status === "Sent")) {
        status = "sent";
        messageId = recipientData.messageId || "AT-ID";
        cost = recipientData.cost || "Ksh 1.0";
      } else {
        status = recipientData ? recipientData.status : "failed";
      }
    } catch (error) {
      console.error("Africa's Talking API Error:", error.message);
      status = "api_error";
    }
  } else {
    // Sandbox or Simulator mode
    console.log("[SMS SIMULATION ACTIVE] Successfully logged message.");
    status = "simulated_sent";
    messageId = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;
    cost = "KSh 1.0";
  }

  // Write to sms_logs collection
  await db.collection("sms_logs").add({
    type,
    recipient_phone: formattedPhone,
    message: messageText,
    status,
    message_id: messageId,
    cost,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });
}


// =========================================================================
// 1. mpesaStkPush (HTTPS Callable)
// =========================================================================
exports.mpesaStkPush = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in to make a payment.");
  }

  const { propertyId, phone, amount } = request.data;
  if (!propertyId || !phone || !amount) {
    throw new HttpsError("invalid-argument", "Missing propertyId, phone, or amount.");
  }

  const landlordId = request.auth.uid;

  const shortcode = process.env.MPESA_SHORTCODE || "174379";
  const passkey = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  const consumerKey = process.env.MPESA_CONSUMER_KEY || "";
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET || "";
  const callbackUrl = process.env.MPESA_CALLBACK_URL || "";

  // Prepare Phone format 254XXXXXXXXX
  let formattedPhone = phone.replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "254" + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith("+")) {
    formattedPhone = formattedPhone.replace("+", "");
  }

  let mpesaCheckoutRequestId = `STK-${Math.floor(100000 + Math.random() * 900000)}`;

  if (consumerKey && consumerSecret && callbackUrl) {
    try {
      // 1. Get Auth Token
      const base64Auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const authResponse = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
        headers: {
          Authorization: `Basic ${base64Auth}`
        }
      });
      const token = authResponse.data.access_token;

      // 2. STK Push Password Setup
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

      // 3. Initiate Push
      const stkResponse = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Number(amount),
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: "Nestlist",
          TransactionDesc: `Listing fee for Property ${propertyId}`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (stkResponse.data && stkResponse.data.CheckoutRequestID) {
        mpesaCheckoutRequestId = stkResponse.data.CheckoutRequestID;
      }
    } catch (error) {
      console.error("M-Pesa STK Push API Error:", error.response ? error.response.data : error.message);
      // Let it fall back to creating a pending request that can be manually or simulated confirmed
    }
  } else {
    console.log("[M-PESA SIMULATION] STK Push requested for KSh", amount);
  }

  // Create payment document
  const paymentRef = await db.collection("listing_payments").add({
    property_id: propertyId,
    landlord_id: landlordId,
    amount: Number(amount),
    property_type: "", // to be filled dynamically
    mpesa_code: "",
    mpesa_checkout_request_id: mpesaCheckoutRequestId,
    amount_paid: 0,
    payer_phone: formattedPhone,
    failure_reason: "",
    status: "pending",
    confirmed_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    paymentId: paymentRef.id,
    mpesaCheckoutRequestId
  };
});


// =========================================================================
// 2. mpesaCallback (HTTPS Request)
// =========================================================================
exports.mpesaCallback = onRequest(async (req, res) => {
  try {
    const callbackData = req.body.Body || req.body;
    console.log("Received M-Pesa Callback Data:", JSON.stringify(callbackData));

    if (!callbackData || !callbackData.stkCallback) {
      res.status(400).send({ status: "invalid body" });
      return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData.stkCallback;

    // Find the listing payment document by checkoutRequestID
    const paymentsSnapshot = await db.collection("listing_payments")
      .where("mpesa_checkout_request_id", "==", CheckoutRequestID)
      .limit(1)
      .get();

    if (paymentsSnapshot.empty) {
      console.warn(`No payment found for CheckoutRequestID: ${CheckoutRequestID}`);
      res.status(200).send({ ResultCode: 0, ResultDesc: "Success (No payment matched)" });
      return;
    }

    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentData = paymentDoc.data();
    const paymentId = paymentDoc.id;

    if (ResultCode === 0) {
      // Payment Successful
      let mpesaCode = "";
      let amountPaid = 0;

      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach((item) => {
          if (item.Name === "MpesaReceiptNumber") mpesaCode = item.Value;
          if (item.Name === "Amount") amountPaid = item.Value;
        });
      }

      // 1. Update listing_payments status to confirmed
      await db.collection("listing_payments").doc(paymentId).update({
        status: "confirmed",
        mpesa_code: mpesaCode,
        amount_paid: amountPaid || paymentData.amount,
        confirmed_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Update properties status to active and calculate 30 day expires_at
      const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      await db.collection("properties").doc(paymentData.property_id).update({
        is_active: true,
        expires_at: expiresAt
      });

      console.log(`Successfully confirmed listing payment ${paymentId} and activated property ${paymentData.property_id}`);
    } else {
      // Payment Failed
      await db.collection("listing_payments").doc(paymentId).update({
        status: ResultCode === 1032 ? "cancelled" : "failed",
        failure_reason: ResultDesc || "Failed transaction"
      });
      console.log(`Listing payment ${paymentId} failed/cancelled with code ${ResultCode}`);
    }

    res.status(200).send({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("Error in M-Pesa Callback:", err);
    res.status(500).send({ status: "error", error: err.message });
  }
});


// =========================================================================
// 3. sendSms (HTTPS Callable)
// =========================================================================
exports.sendSms = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { type, recipientPhone, data } = request.data;
  if (!type || !recipientPhone || !data) {
    throw new HttpsError("invalid-argument", "Missing type, recipientPhone, or data.");
  }

  try {
    await sendSmsViaAT(type, recipientPhone, data);
    return { success: true };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});


// =========================================================================
// 4. onInquiryCreated (Firestore onCreate trigger)
// =========================================================================
exports.onInquiryCreated = onDocumentCreated("inquiries/{inquiryId}", async (event) => {
  const inquiryData = event.data.data();
  if (!inquiryData) return;

  try {
    const { tenant_id, landlord_id, property_id, message } = inquiryData;

    // Fetch tenant, landlord, and property details in parallel
    const [tenantSnap, landlordSnap, propertySnap] = await Promise.all([
      db.collection("profiles").doc(tenant_id).get(),
      db.collection("profiles").doc(landlord_id).get(),
      db.collection("properties").doc(property_id).get()
    ]);

    if (!tenantSnap.exists || !landlordSnap.exists || !propertySnap.exists) {
      console.error("Inquiry trigger missing profiles or property documents.");
      return;
    }

    const tenant = tenantSnap.data();
    const landlord = landlordSnap.data();
    const property = propertySnap.data();

    // 1. Send SMS to Landlord
    if (landlord.phone) {
      await sendSmsViaAT("inquiry_received", landlord.phone, {
        landlordName: landlord.full_name || "Landlord",
        propertyTitle: property.title || "Property",
        tenantName: tenant.full_name || "Tenant",
        tenantPhone: tenant.phone || "No phone",
        message: message || ""
      });
    }

    // 2. Send SMS to Tenant
    if (tenant.phone) {
      await sendSmsViaAT("inquiry_sent", tenant.phone, {
        tenantName: tenant.full_name || "Tenant",
        propertyTitle: property.title || "Property"
      });
    }

  } catch (error) {
    console.error("Error in onInquiryCreated trigger:", error);
  }
});


// =========================================================================
// 5. onPaymentConfirmed (Firestore onUpdate trigger)
// =========================================================================
exports.onPaymentConfirmed = onDocumentUpdated("listing_payments/{paymentId}", async (event) => {
  const oldData = event.data.before.data();
  const newData = event.data.after.data();

  if (!oldData || !newData) return;

  // Fire only when status changes to 'confirmed'
  if (oldData.status !== "confirmed" && newData.status === "confirmed") {
    try {
      const landlordSnap = await db.collection("profiles").doc(newData.landlord_id).get();
      const propertySnap = await db.collection("properties").doc(newData.property_id).get();

      if (!landlordSnap.exists || !propertySnap.exists) {
        console.error("Payment confirmation trigger missing landlord or property documents.");
        return;
      }

      const landlord = landlordSnap.data();
      const property = propertySnap.data();

      if (landlord.phone) {
        await sendSmsViaAT("payment_confirmed", landlord.phone, {
          amount: newData.amount_paid || newData.amount,
          propertyTitle: property.title || "Property"
        });
      }
    } catch (error) {
      console.error("Error in onPaymentConfirmed trigger:", error);
    }
  }
});


// =========================================================================
// 6. onPropertyActivated (Firestore onUpdate trigger)
// =========================================================================
exports.onPropertyActivated = onDocumentUpdated("properties/{propertyId}", async (event) => {
  const oldData = event.data.before.data();
  const newData = event.data.after.data();

  if (!oldData || !newData) return;

  // Fire only when is_active changes from false to true
  if (oldData.is_active === false && newData.is_active === true) {
    try {
      const { county, type, price, amenities } = newData;

      // Query active search alerts
      const alertsSnapshot = await db.collection("search_alerts")
        .where("is_active", "==", true)
        .where("county", "==", county)
        .where("type", "==", type)
        .get();

      if (alertsSnapshot.empty) {
        console.log("No search alerts found matching property's location and type.");
        return;
      }

      const now = Date.now();
      const coorTimeLimit = 24 * 60 * 60 * 1000; // 24 hours cooldown

      for (const alertDoc of alertsSnapshot.docs) {
        const alert = alertDoc.data();
        const alertId = alertDoc.id;

        // 1. Filter by price range
        const minPrice = alert.min_price || 0;
        const maxPrice = alert.max_price || Infinity;
        if (price < minPrice || price > maxPrice) continue;

        // 2. Filter by required amenities in code
        if (alert.amenities && alert.amenities.length > 0) {
          const hasAllAmenities = alert.amenities.every(amenity => amenities && amenities.includes(amenity));
          if (!hasAllAmenities) continue;
        }

        // 3. 24-hour cooldown on last_sent
        if (alert.last_sent) {
          const lastSentTime = alert.last_sent.toDate().getTime();
          if (now - lastSentTime < coorTimeLimit) {
            console.log(`Alert ${alertId} is within 24-hour cooldown, skipping.`);
            continue;
          }
        }

        // Send alert SMS to Tenant
        const tenantSnap = await db.collection("profiles").doc(alert.tenant_id).get();
        if (tenantSnap.exists) {
          const tenant = tenantSnap.data();
          if (tenant.phone) {
            await sendSmsViaAT("search_alert", tenant.phone, {
              propertyType: type.replace("_", " "),
              propertyCounty: county,
              propertyPrice: price
            });

            // Update last_sent to enforce 24-hour cooldown
            await db.collection("search_alerts").doc(alertId).update({
              last_sent: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error("Error in onPropertyActivated trigger:", error);
    }
  }
});


// =========================================================================
// 7. deactivateExpiredListings (Scheduled function, runs daily at midnight Africa/Nairobi)
// =========================================================================
exports.deactivateExpiredListings = onSchedule({
  schedule: "0 0 * * *",
  timeZone: "Africa/Nairobi"
}, async (event) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiredListings = await db.collection("properties")
      .where("is_active", "==", true)
      .where("expires_at", "<", now)
      .get();

    if (expiredListings.empty) {
      console.log("No expired properties found to deactivate.");
      return;
    }

    console.log(`Found ${expiredListings.size} expired listings to deactivate.`);

    const batch = db.batch();

    for (const doc of expiredListings.docs) {
      const property = doc.data();
      const propertyId = doc.id;

      // Deactivate property listing
      batch.update(db.collection("properties").doc(propertyId), {
        is_active: false
      });

      // Send expired SMS alert to landlord
      const landlordSnap = await db.collection("profiles").doc(property.landlord_id).get();
      if (landlordSnap.exists) {
        const landlord = landlordSnap.data();
        if (landlord.phone) {
          await sendSmsViaAT("listing_expired", landlord.phone, {
            landlordName: landlord.full_name || "Landlord",
            propertyTitle: property.title || "Property"
          });
        }
      }
    }

    await batch.commit();
    console.log("Deactivation and SMS reminders complete.");
  } catch (error) {
    console.error("Error in deactivateExpiredListings scheduled function:", error);
  }
});


// =========================================================================
// 8. sendExpiryReminders (Scheduled function, runs daily)
// =========================================================================
exports.sendExpiryReminders = onSchedule("0 10 * * *", async (event) => {
  try {
    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const propertiesNearExpiry = await db.collection("properties")
      .where("is_active", "==", true)
      .where("expires_at", "<=", admin.firestore.Timestamp.fromDate(in5Days))
      .get();

    if (propertiesNearExpiry.empty) {
      console.log("No listings expiring within 5 days.");
      return;
    }

    for (const doc of propertiesNearExpiry.docs) {
      const property = doc.data();
      const expiresAtDate = property.expires_at.toDate();
      const diffTime = expiresAtDate.getTime() - now.getTime();
      const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Skip if already past expired
      if (daysRemaining <= 0) continue;

      const landlordSnap = await db.collection("profiles").doc(property.landlord_id).get();
      if (landlordSnap.exists) {
        const landlord = landlordSnap.data();
        if (landlord.phone) {
          await sendSmsViaAT("listing_expiring", landlord.phone, {
            landlordName: landlord.full_name || "Landlord",
            propertyTitle: property.title || "Property",
            daysRemaining
          });
        }
      }
    }

    console.log("Expiry reminders sent successfully.");
  } catch (error) {
    console.error("Error in sendExpiryReminders scheduled function:", error);
  }
});
