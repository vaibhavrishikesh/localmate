/** Manual DB types aligned with supabase/migrations — regenerate later with supabase gen types. */

export type AppRole = "customer" | "helper";
export type PriceModeDb = "fixed" | "negotiable";
export type TaskStatusDb =
  | "looking"
  | "matched"
  | "active"
  | "awaiting_customer_confirmation"
  | "pay"
  | "review"
  | "completed"
  | "cancelled"
  | "flagged";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type IdentityReviewStatusDb = "none" | "pending" | "cleared" | "rejected";
export type PaymentStatusDb = "held" | "released" | "refunded";

export interface ProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string;
  city: string;
  area: string | null;
  role: AppRole;
  phone_verified: boolean;
  identity_verified: boolean;
  identity_review_status: IdentityReviewStatusDb;
  conduct_accepted: boolean;
  categories: string[];
  bio_en: string;
  bio_hi: string;
  rating: number;
  tasks_completed: number;
  response_rate: number;
  is_demo: boolean;
  is_admin: boolean;
  member_since: string;
  created_at: string;
}

export interface TaskRow {
  id: string;
  customer_id: string;
  category: string;
  title: string;
  title_hi: string | null;
  description: string;
  description_hi: string | null;
  location_area: string;
  to_area: string | null;
  latitude: number | null;
  longitude: number | null;
  when_id: string;
  when_label: string;
  when_label_hi: string | null;
  scheduled_at: string | null;
  price_mode: PriceModeDb;
  budget: number;
  status: TaskStatusDb;
  helper_id: string | null;
  agreed_amount: number | null;
  location_shared: boolean;
  helper_arrived_at: string | null;
  helper_marked_done_at: string | null;
  customer_confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  flagged_at: string | null;
  flag_reason: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface ApplicationRow {
  id: string;
  task_id: string;
  helper_id: string;
  offer_amount: number;
  message: string;
  status: ApplicationStatus;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  original_text: string;
  translated_text: string | null;
  source_lang: string | null;
  target_lang: string | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  task_id: string;
  customer_id: string;
  helper_id: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  title_hi: string | null;
  message: string;
  message_hi: string | null;
  related_task_id: string | null;
  href: string;
  read: boolean;
  created_at: string;
}

export interface BlockRow {
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  task_id: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface PaymentHoldRow {
  id: string;
  task_id: string;
  customer_id: string;
  helper_id: string;
  amount: number;
  fee: number;
  helper_amount: number;
  status: PaymentStatusDb;
  is_simulated: boolean;
  held_at: string;
  released_at: string | null;
}

export interface ReviewRow {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}
