import { Timestamp } from "firebase/firestore";

export type UserRole = "landlord" | "tenant";

export interface UserProfile {
  uid: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  created_at: Timestamp | Date;
}

export type PropertyType = 
  | "single_room" 
  | "bedsitter" 
  | "studio" 
  | "1br" 
  | "2br" 
  | "3br" 
  | "4br" 
  | "5br_plus";

export type PropertyStatus = "available" | "taken";

export interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  location: string;
  county: string;
  price: number;
  type: PropertyType;
  amenities: string[];
  images: string[];
  status: PropertyStatus;
  is_active: boolean;
  expires_at: Timestamp | null;
  created_at: Timestamp | Date;
}

export type PaymentStatus = "pending" | "confirmed" | "failed" | "cancelled";

export interface ListingPayment {
  id: string;
  property_id: string;
  landlord_id: string;
  amount: number;
  property_type: string;
  mpesa_code: string;
  mpesa_checkout_request_id: string;
  amount_paid: number;
  payer_phone: string;
  failure_reason: string;
  status: PaymentStatus;
  confirmed_at: Timestamp | null;
  created_at: Timestamp | Date;
}

export type InquiryStatus = "pending" | "responded" | "closed";

export interface Inquiry {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  message: string;
  status: InquiryStatus;
  created_at: Timestamp | Date;
}

export interface InquiryMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: Timestamp | Date;
}

export interface SavedProperty {
  id: string; // `${tenant_id}_${property_id}`
  tenant_id: string;
  property_id: string;
  created_at: Timestamp | Date;
}

export interface SearchAlert {
  id: string;
  tenant_id: string;
  name: string;
  county: string;
  type: PropertyType | "";
  min_price: number;
  max_price: number;
  amenities: string[];
  is_active: boolean;
  last_sent: Timestamp | null;
  created_at: Timestamp | Date;
}

export interface SmsLog {
  id: string;
  type: string;
  recipient_phone: string;
  message: string;
  status: string;
  message_id: string;
  cost: string;
  created_at: Timestamp | Date;
}

export const LISTING_FEES: Record<PropertyType, number> = {
  single_room: 100,
  bedsitter: 200,
  studio: 250,
  "1br": 500,
  "2br": 700,
  "3br": 1000,
  "4br": 1200,
  "5br_plus": 1500,
};

export const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kiambu", "Kajiado", "Machakos", "Nakuru", "Uasin Gishu", "Kisumu", 
  "Laikipia", "Nyeri", "Meru", "Murang'a", "Kakamega", "Bungoma", "Kilifi", "Kwale", 
  "Kericho", "Bomet", "Nandi", "Trans Nzoia", "Kisii", "Nyamira", "Homa Bay", "Migori", 
  "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Tharaka-Nithi", "Embu", "Kitui", 
  "Makueni", "Nyandarua", "Kirinyaga", "Samburu", "Baringo", "Elgeyo-Marakwet", "West Pokot", 
  "Turkana", "Vihiga", "Busia", "Siaya", "Narok", "Taita-Taveta", "Tana River", "Lamu"
].sort();

export const AMENITIES_LIST = [
  "Water 24/7", "Borehole", "Parking", "Security Guard", "CCTV", "Electric Fence", 
  "Backup Generator", "WiFi Ready", "DSTV Ready", "Tiled Floors", "Servant Quarter", 
  "Garden", "Balcony", "Near Tarmac", "Near School", "Near Shopping Centre"
];
