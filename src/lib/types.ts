export type Lang =
  | "en"
  | "hi"
  | "ne"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ru"
  | "tr"
  | "ar"
  | "he"
  | "zh"
  | "ja"
  | "ko";
export type Role = "customer" | "helper";
export type PriceMode = "fixed" | "negotiable";
export type TaskStatus =
  | "looking"
  | "matched"
  | "active"
  | "awaiting_customer_confirmation"
  | "pay"
  | "review"
  | "completed"
  | "cancelled"
  | "flagged";

export type CategoryId =
  | "accommodation"
  | "transport"
  | "scooter"
  | "luggage"
  | "guide"
  | "shopping"
  | "delivery"
  | "tech"
  | "translation"
  | "photo"
  | "wellness"
  | "cleaning"
  | "repair"
  | "other";

export interface PastReview {
  id: string;
  by: string;
  stars: number;
  text: string;
}

export type IdentityReviewStatus = "none" | "pending" | "cleared" | "rejected";
export type PaymentStatus = "held" | "released" | "refunded";

export interface Payment {
  id: string;
  taskId: string;
  customerId: string;
  helperId: string;
  /** Server-locked from agreedAmount — never rewritten by clients. */
  amount: number;
  fee: number;
  helperAmount: number;
  status: PaymentStatus;
  heldAt: string;
  releasedAt?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  language: Lang;
  city: string;
  area: string;
  rating: number;
  tasksCompleted: number;
  responseRate: number;
  memberSince: string;
  /** Only LocalMate staff can set this true — never from the client. */
  identityVerified: boolean;
  identityReviewStatus?: IdentityReviewStatus;
  phoneVerified: boolean;
  conductAccepted?: boolean;
  categories?: CategoryId[];
  bioEn: string;
  bioHi: string;
  reviews: PastReview[];
}

export interface Offer {
  id: string;
  taskId: string;
  helperId: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface Task {
  id: string;
  customerId: string;
  category: CategoryId;
  title: string;
  titleHi?: string;
  details: string;
  detailsHi?: string;
  area: string;
  toArea?: string;
  whenId: string;
  whenLabel: string;
  whenLabelHi?: string;
  priceMode: PriceMode;
  budget: number;
  status: TaskStatus;
  helperId?: string;
  agreedAmount?: number;
  locationShared: boolean;
  createdAt: string;
  helperMarkedDoneAt?: string;
  customerConfirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
  flaggedAt?: string;
  flagReason?: string;
}

export interface ChatMessage {
  id: string;
  taskId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  titleEn: string;
  titleHi: string;
  bodyEn: string;
  bodyHi: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  by: string;
  userId: string;
  taskId?: string;
  reason: string;
  createdAt: string;
}

export interface Block {
  by: string;
  userId: string;
}

export interface NewTaskInput {
  category: CategoryId;
  title: string;
  details: string;
  area: string;
  toArea?: string;
  whenId: string;
  whenLabel: string;
  whenLabelHi?: string;
  priceMode: PriceMode;
  budget: number;
}

export interface AppState {
  users: User[];
  tasks: Task[];
  offers: Offer[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  reports: Report[];
  blocks: Block[];
  payments: Payment[];
  sessionUserId: string | null;
  uiLang?: Lang;
}
