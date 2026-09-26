import type { AppState } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/env";
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
} from "@/lib/supabase/database.types";
import {
  mapApplication,
  mapBlock,
  mapMessage,
  mapNotification,
  mapPayment,
  mapProfile,
  mapReport,
  mapTask,
} from "@/lib/supabase/map";

/**
 * Loads marketplace state from Supabase.
 * Prefer user-scoped client (RLS). Falls back to service role only for
 * admin/bootstrap when explicitly available — still never sent to browser.
 */
export async function loadSupabasePublicState(sessionUserId: string | null): Promise<AppState> {
  const sb = hasServiceRole() ? createAdminClient() : await createClient();

  const [
    { data: profiles },
    { data: tasks },
    { data: applications },
    { data: conversations },
    { data: messages },
    { data: notifications },
    { data: blocks },
    { data: reports },
    { data: payments },
    { data: reviews },
  ] = await Promise.all([
    sb.from("profiles").select("*"),
    sb.from("tasks").select("*").order("created_at", { ascending: false }),
    sb.from("task_applications").select("*").eq("status", "pending"),
    sb.from("conversations").select("*"),
    sb.from("messages").select("*").order("created_at", { ascending: true }),
    sb.from("notifications").select("*").order("created_at", { ascending: false }),
    sb.from("user_blocks").select("*"),
    sb.from("reports").select("*"),
    sb.from("payment_holds").select("*"),
    sb.from("reviews").select("*"),
  ]);

  const reviewRows = (reviews ?? []) as ReviewRow[];
  const convById = new Map(((conversations ?? []) as ConversationRow[]).map((c) => [c.id, c]));

  return {
    users: ((profiles ?? []) as ProfileRow[]).map((p) => mapProfile(p, reviewRows)),
    tasks: ((tasks ?? []) as TaskRow[]).map(mapTask),
    offers: ((applications ?? []) as ApplicationRow[]).map(mapApplication),
    messages: ((messages ?? []) as MessageRow[])
      .map((m) => {
        const conv = convById.get(m.conversation_id);
        return conv ? mapMessage(m, conv.task_id) : null;
      })
      .filter(Boolean) as AppState["messages"],
    notifications: ((notifications ?? []) as NotificationRow[]).map(mapNotification),
    reports: ((reports ?? []) as ReportRow[]).map(mapReport),
    blocks: ((blocks ?? []) as BlockRow[]).map(mapBlock),
    payments: ((payments ?? []) as PaymentHoldRow[]).map(mapPayment),
    sessionUserId,
  };
}
