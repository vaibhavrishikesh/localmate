import type {
  AppNotification,
  Block,
  CategoryId,
  ChatMessage,
  Lang,
  Offer,
  Payment,
  Report,
  Role,
  Task,
  TaskStatus,
  User,
} from "@/lib/types";
import type {
  ApplicationRow,
  BlockRow,
  ConversationRow,
  MessageRow,
  NotificationRow,
  PaymentHoldRow,
  ProfileRow,
  ReportRow,
  ReviewRow,
  TaskRow,
} from "./database.types";

export function mapProfile(row: ProfileRow, reviews: ReviewRow[] = []): User {
  const mine = reviews.filter((r) => r.reviewee_id === row.id);
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    role: row.role as Role,
    language: (row.preferred_language as Lang) || "en",
    city: row.city,
    area: row.area ?? "",
    rating: Number(row.rating),
    tasksCompleted: row.tasks_completed,
    responseRate: row.response_rate,
    memberSince: row.member_since.slice(0, 10),
    identityVerified: row.identity_verified,
    identityReviewStatus: row.identity_review_status,
    phoneVerified: row.phone_verified,
    conductAccepted: row.conduct_accepted,
    categories: row.categories as CategoryId[],
    bioEn: row.bio_en,
    bioHi: row.bio_hi,
    reviews: mine.map((r) => ({
      id: r.id,
      by: r.reviewer_id,
      stars: r.rating,
      text: r.comment,
    })),
  };
}

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    customerId: row.customer_id,
    category: row.category as Task["category"],
    title: row.title,
    titleHi: row.title_hi ?? undefined,
    details: row.description,
    detailsHi: row.description_hi ?? undefined,
    area: row.location_area,
    toArea: row.to_area ?? undefined,
    whenId: row.when_id,
    whenLabel: row.when_label,
    whenLabelHi: row.when_label_hi ?? undefined,
    priceMode: row.price_mode,
    budget: row.budget,
    status: row.status as TaskStatus,
    helperId: row.helper_id ?? undefined,
    agreedAmount: row.agreed_amount ?? undefined,
    locationShared: row.location_shared,
    createdAt: row.created_at,
    helperArrivedAt: row.helper_arrived_at ?? undefined,
    helperMarkedDoneAt: row.helper_marked_done_at ?? undefined,
    customerConfirmedAt: row.customer_confirmed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    flaggedAt: row.flagged_at ?? undefined,
    flagReason: row.flag_reason ?? undefined,
  };
}

export function mapApplication(row: ApplicationRow): Offer {
  return {
    id: row.id,
    taskId: row.task_id,
    helperId: row.helper_id,
    amount: row.offer_amount,
    note: row.message,
    createdAt: row.created_at,
  };
}

export function mapMessage(row: MessageRow, taskId: string): ChatMessage {
  return {
    id: row.id,
    taskId,
    senderId: row.sender_id,
    text: row.original_text,
    createdAt: row.created_at,
  };
}

export function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    titleEn: row.title,
    titleHi: row.title_hi ?? row.title,
    bodyEn: row.message,
    bodyHi: row.message_hi ?? row.message,
    href: row.href,
    read: row.read,
    createdAt: row.created_at,
  };
}

export function mapBlock(row: BlockRow): Block {
  return { by: row.blocker_id, userId: row.blocked_id };
}

export function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    by: row.reporter_id,
    userId: row.reported_user_id,
    taskId: row.task_id ?? undefined,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function mapPayment(row: PaymentHoldRow): Payment {
  return {
    id: row.id,
    taskId: row.task_id,
    customerId: row.customer_id,
    helperId: row.helper_id,
    amount: row.amount,
    fee: row.fee,
    helperAmount: row.helper_amount,
    status: row.status,
    heldAt: row.held_at,
    releasedAt: row.released_at ?? undefined,
  };
}

export type { ConversationRow };
