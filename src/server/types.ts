import type {
  AppNotification,
  AppState,
  Block,
  CategoryId,
  ChatMessage,
  IdentityReviewStatus,
  Lang,
  NewTaskInput,
  Offer,
  PastReview,
  Payment,
  PaymentStatus,
  PriceMode,
  Report,
  Role,
  Task,
  TaskStatus,
  User,
} from "@/lib/types";

export type { Payment, PaymentStatus, IdentityReviewStatus, NewTaskInput };

export interface ServerUser extends User {
  identityReviewStatus: IdentityReviewStatus;
}

export interface ServerState {
  users: ServerUser[];
  tasks: Task[];
  offers: Offer[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  reports: Report[];
  blocks: Block[];
  payments: Payment[];
}

export interface PublicState {
  users: ServerUser[];
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

export type MutateResult =
  | { ok: true; state: PublicState; extra?: { id?: string }; userId?: string }
  | { ok: false; error: string };

export type {
  AppState,
  CategoryId,
  ChatMessage,
  Lang,
  Offer,
  PastReview,
  PriceMode,
  Report,
  Role,
  Task,
  TaskStatus,
  User,
  Block,
  AppNotification,
};
