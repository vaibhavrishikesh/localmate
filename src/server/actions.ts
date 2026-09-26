import type { NewTaskInput } from "@/lib/types";
import {
  isBanned,
  isClearedHelper,
  money,
  openJobCount,
  splitFee,
  uid,
  workerBlock,
} from "@/lib/catalog";
import type { Lang, Role, Task } from "@/lib/types";
import {
  canTransition,
  isCancelReason,
  isChatOpen,
  isOpenForOffers,
  nextStatus,
  validateOfferAmount,
  type CancelReasonId,
} from "@/lib/workflow";
import { resetDatabase, readState, updateState } from "./db";
import type {
  MutateResult,
  Payment,
  PublicState,
  ServerState,
  ServerUser,
} from "./types";

function toPublic(state: ServerState, sessionUserId: string | null, uiLang?: Lang): PublicState {
  return {
    users: state.users,
    tasks: state.tasks,
    offers: state.offers,
    messages: state.messages,
    notifications: state.notifications,
    reports: state.reports,
    blocks: state.blocks,
    payments: state.payments,
    sessionUserId,
    uiLang,
  };
}

function notify(
  state: ServerState,
  input: {
    userId: string;
    titleEn: string;
    titleHi: string;
    bodyEn: string;
    bodyHi: string;
    href: string;
  },
): void {
  state.notifications.unshift({
    id: uid(),
    read: false,
    createdAt: new Date().toISOString(),
    ...input,
  });
}

function patchTask(state: ServerState, taskId: string, patch: Partial<Task>) {
  state.tasks = state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task));
}

function systemMessage(state: ServerState, taskId: string) {
  state.messages.push({
    id: uid(),
    taskId,
    senderId: "system",
    text: "You are connected. Keep the task and payment inside LocalMate.",
    createdAt: new Date().toISOString(),
  });
}

function userById(state: ServerState, id: string | null | undefined) {
  if (!id) return null;
  return state.users.find((item) => item.id === id) ?? null;
}

function isBlocked(state: ServerState, a: string, b: string) {
  return state.blocks.some(
    (block) => (block.by === a && block.userId === b) || (block.by === b && block.userId === a),
  );
}

/** agreedAmount is immutable once set — ignore any client rewrite attempts. */
function lockedAmount(task: Task): number | null {
  if (typeof task.agreedAmount === "number" && task.agreedAmount > 0) return task.agreedAmount;
  return null;
}

export async function buildPublicState(sessionUserId: string | null, uiLang?: Lang): Promise<PublicState> {
  const state = await readState();
  return toPublic(state, sessionUserId, uiLang);
}

export async function signUp(input: {
  name: string;
  phone: string;
  email: string;
  role: Role;
  language: Lang;
}): Promise<MutateResult & { userId?: string }> {
  let userId = "";
  const state = await updateState((draft) => {
    userId = uid();
    const next: ServerUser = {
      id: userId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      role: input.role,
      language: input.language,
      city: "Rishikesh",
      area: input.role === "helper" ? "laxman" : "tapovan",
      rating: 0,
      tasksCompleted: 0,
      responseRate: 100,
      memberSince: "2026",
      identityVerified: false,
      identityReviewStatus: "none",
      phoneVerified: true,
      conductAccepted: false,
      categories: [],
      bioEn: "",
      bioHi: "",
      reviews: [],
    };
    draft.users.push(next);
  });
  return { ok: true, state: toPublic(state, userId), extra: { id: userId }, userId };
}

export async function saveWorkerSetup(sessionUserId: string, categories: import("@/lib/types").CategoryId[]): Promise<MutateResult> {
  if (categories.length === 0) return { ok: false, error: "Pick at least one category." };
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    if (!user || user.role !== "helper") return;
    // Never touch identityVerified here — only admin can clear ID.
    user.categories = categories;
    user.conductAccepted = true;
  });
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function requestIdentityReview(sessionUserId: string): Promise<MutateResult> {
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    if (!user || user.role !== "helper") return;
    if (user.identityVerified || user.identityReviewStatus === "cleared") return;
    user.identityReviewStatus = "pending";
    // Explicit: never set identityVerified from this path.
    user.identityVerified = false;
  });
  return { ok: true, state: toPublic(state, sessionUserId) };
}

/** Admin-only. Client must never call this without LOCALMATE_ADMIN_SECRET. */
export async function adminVerifyUser(userId: string, cleared: boolean): Promise<MutateResult> {
  const state = await updateState((draft) => {
    const user = userById(draft, userId);
    if (!user) return;
    user.identityVerified = cleared;
    user.identityReviewStatus = cleared ? "cleared" : "rejected";
  });
  const exists = state.users.some((u) => u.id === userId);
  if (!exists) return { ok: false, error: "User not found." };
  return { ok: true, state: toPublic(state, null) };
}

export async function createTask(sessionUserId: string, input: NewTaskInput): Promise<MutateResult> {
  const userCheck = await updateState((s) => s);
  const user = userById(userCheck, sessionUserId);
  if (!user || user.role !== "customer") return { ok: false, error: "Only customers can post tasks." };
  if (!input.title.trim() || !input.details.trim() || input.budget < 50) {
    return { ok: false, error: "invalid" };
  }
  if (isBanned(`${input.title} ${input.details}`)) return { ok: false, error: "banned" };

  let taskId = "";
  const state = await updateState((draft) => {
    taskId = uid();
    draft.tasks.unshift({
      id: taskId,
      customerId: sessionUserId,
      category: input.category,
      title: input.title.trim(),
      details: input.details.trim(),
      area: input.area,
      toArea: input.toArea || undefined,
      whenId: input.whenId,
      whenLabel: input.whenLabel,
      whenLabelHi: input.whenLabelHi,
      priceMode: input.priceMode,
      budget: input.budget,
      status: "looking",
      locationShared: false,
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true, state: toPublic(state, sessionUserId), extra: { id: taskId } };
}

export async function sendOffer(
  sessionUserId: string,
  taskId: string,
  amount: number,
  note: string,
): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || user.role !== "helper" || !task) {
      error = "Not allowed.";
      return;
    }
    if (!isOpenForOffers(task.status) || task.customerId === user.id) {
      error = "Task not open.";
      return;
    }
    if (isBlocked(draft, task.customerId, user.id)) {
      error = "Blocked.";
      return;
    }

    const validated =
      task.priceMode === "fixed"
        ? validateOfferAmount(task.budget, task)
        : validateOfferAmount(amount, task);
    if (!validated.ok) {
      error = `offer:${validated.error}`;
      return;
    }

    const openCount = openJobCount(draft.tasks, draft.offers, user.id, taskId);
    if (workerBlock(user, task, validated.amount, openCount)) {
      error = "Worker blocked for this task.";
      return;
    }

    draft.offers = draft.offers.filter((item) => !(item.taskId === taskId && item.helperId === user.id));
    draft.offers.unshift({
      id: uid(),
      taskId,
      helperId: user.id,
      amount: validated.amount,
      note: note.trim() || "I can do this",
      createdAt: new Date().toISOString(),
    });
    notify(draft, {
      userId: task.customerId,
      titleEn: `${user.name.split(" ")[0]} wants to help with your task.`,
      titleHi: `${user.name.split(" ")[0]} आपके काम में मदद करना चाहता है।`,
      bodyEn: `${money(validated.amount)} · ${user.rating ? user.rating.toFixed(1) : "New"} · ${user.tasksCompleted} tasks`,
      bodyHi: `${money(validated.amount)} · ${user.rating ? user.rating.toFixed(1) : "नए"} · ${user.tasksCompleted} काम`,
      href: `/task/${taskId}`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function acceptOffer(sessionUserId: string, offerId: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const offer = draft.offers.find((item) => item.id === offerId);
    if (!user || !offer) {
      error = "Not found.";
      return;
    }
    const task = draft.tasks.find((item) => item.id === offer.taskId);
    const helper = userById(draft, offer.helperId);
    if (!task || !helper || task.customerId !== user.id || !isOpenForOffers(task.status)) {
      error = "Cannot accept.";
      return;
    }
    if (isBlocked(draft, user.id, helper.id)) {
      error = "Blocked.";
      return;
    }
    const amountCheck = validateOfferAmount(offer.amount, task);
    if (!amountCheck.ok) {
      error = `offer:${amountCheck.error}`;
      return;
    }
    if (!isClearedHelper(helper)) {
      error = "Helper not cleared.";
      return;
    }
    if (workerBlock(helper, task, amountCheck.amount, openJobCount(draft.tasks, draft.offers, helper.id, task.id))) {
      error = "Helper blocked.";
      return;
    }
    const gate = canTransition(task, "accept_offer", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    // Lock amount on the server — clients cannot rewrite later.
    patchTask(draft, task.id, {
      status: nextStatus("accept_offer"),
      helperId: helper.id,
      agreedAmount: amountCheck.amount,
    });
    systemMessage(draft, task.id);
    notify(draft, {
      userId: helper.id,
      titleEn: `${user.name.split(" ")[0]} accepted you.`,
      titleHi: `${user.name.split(" ")[0]} ने आपको चुन लिया।`,
      bodyEn: `${task.title} · ${money(amountCheck.amount)}`,
      bodyHi: `${task.titleHi || task.title} · ${money(amountCheck.amount)}`,
      href: `/task/${task.id}/chat`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function startTask(sessionUserId: string, taskId: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || !isClearedHelper(user)) {
      error = "Cannot start.";
      return;
    }
    if (isBlocked(draft, task.customerId, user.id)) {
      error = "Blocked.";
      return;
    }
    const gate = canTransition(task, "start", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    patchTask(draft, taskId, { status: nextStatus("start") });
    notify(draft, {
      userId: task.customerId,
      titleEn: `${user.name.split(" ")[0]} started your task.`,
      titleHi: `${user.name.split(" ")[0]} ने आपका काम शुरू कर दिया।`,
      bodyEn: task.title,
      bodyHi: task.titleHi || task.title,
      href: `/task/${taskId}/work`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function shareLocation(sessionUserId: string, taskId: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || task.status !== "active") {
      error = "Not active.";
      return;
    }
    if (task.customerId !== user.id && task.helperId !== user.id) {
      error = "Not a party.";
      return;
    }
    const otherId = task.customerId === user.id ? task.helperId : task.customerId;
    if (otherId && isBlocked(draft, user.id, otherId)) {
      error = "Blocked.";
      return;
    }
    patchTask(draft, taskId, { locationShared: true });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

/**
 * Helper marks work done → awaiting customer confirmation (not paid/completed yet).
 * Customer cannot use this path to silently finish the job.
 */
export async function completeTask(sessionUserId: string, taskId: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task) {
      error = "Not found.";
      return;
    }
    if (isBlocked(draft, task.customerId, task.helperId ?? "")) {
      error = "Blocked — task is restricted.";
      return;
    }
    const gate = canTransition(task, "helper_mark_done", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    if (!lockedAmount(task)) {
      error = "Amount not locked.";
      return;
    }
    const now = new Date().toISOString();
    patchTask(draft, taskId, {
      status: nextStatus("helper_mark_done"),
      helperMarkedDoneAt: now,
    });
    notify(draft, {
      userId: task.customerId,
      titleEn: "Helper marked the task done — please confirm.",
      titleHi: "हेल्पर ने काम पूरा मार्क किया — कृपया कन्फ़र्म करें।",
      bodyEn: `${task.title} · Simulated in-app alert`,
      bodyHi: `${task.titleHi || task.title} · सिम्युलेटेड इन-ऐप अलर्ट`,
      href: `/task/${taskId}/work`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

/** Customer confirms helper's completion → opens payment hold step. */
export async function confirmCompletion(sessionUserId: string, taskId: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || !task.helperId) {
      error = "Not found.";
      return;
    }
    const gate = canTransition(task, "customer_confirm_done", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    const now = new Date().toISOString();
    patchTask(draft, taskId, {
      status: nextStatus("customer_confirm_done"),
      customerConfirmedAt: now,
    });
    notify(draft, {
      userId: task.helperId,
      titleEn: "Customer confirmed completion. Awaiting payment hold.",
      titleHi: "कस्टमर ने पूरा होना कन्फ़र्म किया। पेमेंट होल्ड का इंतज़ार।",
      bodyEn: `${task.title} · Simulated in-app alert`,
      bodyHi: `${task.titleHi || task.title} · सिम्युलेटेड इन-ऐप अलर्ट`,
      href: `/task/${taskId}/pay`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

/** Customer reports a problem instead of confirming — flags for review, does not pay. */
export async function reportTaskProblem(sessionUserId: string, taskId: string, reason: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || !task.helperId) {
      error = "Not found.";
      return;
    }
    const gate = canTransition(task, "customer_report_problem", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    const note = reason.trim() || "Problem reported";
    patchTask(draft, taskId, {
      status: nextStatus("customer_report_problem"),
      flaggedAt: new Date().toISOString(),
      flagReason: note,
    });
    draft.reports.unshift({
      id: uid(),
      by: sessionUserId,
      userId: task.helperId,
      taskId,
      reason: note,
      createdAt: new Date().toISOString(),
    });
    notify(draft, {
      userId: task.helperId,
      titleEn: "Customer reported a problem. Task flagged — no payment yet.",
      titleHi: "कस्टमर ने समस्या बताई। काम फ़्लैग — अभी पेमेंट नहीं।",
      bodyEn: note,
      bodyHi: note,
      href: `/task/${taskId}/work`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function cancelTask(
  sessionUserId: string,
  taskId: string,
  reasonId: string,
): Promise<MutateResult> {
  if (!isCancelReason(reasonId)) return { ok: false, error: "Pick a cancellation reason." };
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task) {
      error = "Not found.";
      return;
    }
    const gate = canTransition(task, "cancel", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    const reason = reasonId as CancelReasonId;
    patchTask(draft, taskId, {
      status: nextStatus("cancel"),
      cancelledAt: new Date().toISOString(),
      cancelledBy: user.id,
      cancelReason: reason,
    });
    // Drop open offers on cancelled looking/matched tasks
    draft.offers = draft.offers.filter((offer) => offer.taskId !== taskId);
    const otherId = user.id === task.customerId ? task.helperId : task.customerId;
    if (otherId) {
      notify(draft, {
        userId: otherId,
        titleEn: `${user.name.split(" ")[0]} cancelled the task.`,
        titleHi: `${user.name.split(" ")[0]} ने काम रद्द कर दिया।`,
        bodyEn: `${task.title} · Simulated in-app alert`,
        bodyHi: `${task.titleHi || task.title} · सिम्युलेटेड इन-ऐप अलर्ट`,
        href: `/task/${taskId}`,
      });
    }
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

/**
 * Customer places the locked agreed amount into LocalMate hold.
 * Client cannot supply or change the amount — server uses task.agreedAmount only.
 */
export async function holdPayment(sessionUserId: string, taskId: string): Promise<MutateResult> {
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || !task.helperId) {
      error = "Cannot hold payment.";
      return;
    }
    const gate = canTransition(task, "hold_payment", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    if (isBlocked(draft, task.customerId, task.helperId)) {
      error = "Blocked — payment locked until review.";
      return;
    }
    const amount = lockedAmount(task);
    if (amount == null) {
      error = "Agreed amount missing.";
      return;
    }
    if (draft.payments.some((p) => p.taskId === taskId && (p.status === "held" || p.status === "released"))) {
      error = "Payment already held.";
      return;
    }
    const parts = splitFee(amount);
    const payment: Payment = {
      id: uid(),
      taskId,
      customerId: user.id,
      helperId: task.helperId,
      amount: parts.total,
      fee: parts.fee,
      helperAmount: parts.helper,
      status: "held",
      heldAt: new Date().toISOString(),
    };
    draft.payments.unshift(payment);
    patchTask(draft, taskId, { status: nextStatus("hold_payment") });
    notify(draft, {
      userId: task.helperId,
      titleEn: `${user.name.split(" ")[0]} placed ${money(amount)} in hold.`,
      titleHi: `${user.name.split(" ")[0]} ने ${money(amount)} होल्ड में डाले।`,
      bodyEn: `You receive ${money(parts.helper)} after review confirm · Simulated alert`,
      bodyHi: `रिव्यू कन्फ़र्म के बाद आपको ${money(parts.helper)} · सिम्युलेटेड अलर्ट`,
      href: `/task/${taskId}/review`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

/**
 * Customer confirms the job. Releases held payment to helper. Amount cannot change.
 */
export async function confirmAndReview(
  sessionUserId: string,
  taskId: string,
  stars: number,
  text: string,
): Promise<MutateResult> {
  let error = "";
  const note = text.trim();
  if (!note || stars < 1) return { ok: false, error: "Review required." };

  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || !task.helperId) {
      error = "Cannot confirm.";
      return;
    }
    const gate = canTransition(task, "complete_review", user.id, user.role);
    if (!gate.ok) {
      error = gate.error;
      return;
    }
    if (isBlocked(draft, task.customerId, task.helperId)) {
      error = "Blocked — cannot release payment.";
      return;
    }
    const payment = draft.payments.find((p) => p.taskId === taskId && p.status === "held");
    if (!payment) {
      error = "No held payment.";
      return;
    }
    const locked = lockedAmount(task);
    if (locked == null || payment.amount !== locked) {
      error = "Amount mismatch — payment blocked.";
      return;
    }
    // Prevent duplicate completion
    if (task.status === "completed") {
      error = "Already completed.";
      return;
    }
    payment.status = "released";
    payment.releasedAt = new Date().toISOString();
    patchTask(draft, taskId, { status: nextStatus("complete_review") });

    draft.users = draft.users.map((item) => {
      if (item.id !== task.helperId) return item;
      const tasksCompleted = item.tasksCompleted + 1;
      const rating = Math.round(((item.rating * item.tasksCompleted + stars) / tasksCompleted) * 10) / 10;
      return {
        ...item,
        tasksCompleted,
        rating,
        reviews: [{ id: uid(), by: user.name.split(" ")[0], stars, text: note }, ...item.reviews],
      };
    });

    notify(draft, {
      userId: task.helperId,
      titleEn: `Payment released · ${money(payment.helperAmount)}.`,
      titleHi: `पेमेंट रिलीज़ · ${money(payment.helperAmount)}.`,
      bodyEn: `${user.name.split(" ")[0]} confirmed · ${stars} stars.`,
      bodyHi: `${user.name.split(" ")[0]} ने कन्फ़र्म किया · ${stars} स्टार।`,
      href: `/people/${task.helperId}`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function sendMessage(sessionUserId: string, taskId: string, text: string): Promise<MutateResult> {
  const body = text.trim();
  if (!body) return { ok: false, error: "Empty." };
  let error = "";
  const state = await updateState((draft) => {
    const user = userById(draft, sessionUserId);
    const task = draft.tasks.find((item) => item.id === taskId);
    if (!user || !task || !isChatOpen(task.status)) {
      error = "Chat closed.";
      return;
    }
    if (task.customerId !== user.id && task.helperId !== user.id) {
      error = "Not a party.";
      return;
    }
    const otherId = task.customerId === user.id ? task.helperId : task.customerId;
    if (!otherId || isBlocked(draft, user.id, otherId)) {
      error = "Blocked.";
      return;
    }
    draft.messages.push({
      id: uid(),
      taskId,
      senderId: user.id,
      text: body,
      createdAt: new Date().toISOString(),
    });
    notify(draft, {
      userId: otherId,
      titleEn: user.name.split(" ")[0],
      titleHi: user.name.split(" ")[0],
      bodyEn: body,
      bodyHi: body,
      href: `/task/${taskId}/chat`,
    });
  });
  if (error) return { ok: false, error };
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function reportUser(
  sessionUserId: string,
  userId: string,
  reason: string,
  taskId?: string,
): Promise<MutateResult> {
  const state = await updateState((draft) => {
    draft.reports.unshift({
      id: uid(),
      by: sessionUserId,
      userId,
      taskId,
      reason,
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function blockUser(sessionUserId: string, userId: string, taskId?: string): Promise<MutateResult> {
  if (userId === sessionUserId) return { ok: false, error: "Cannot block yourself." };
  const state = await updateState((draft) => {
    if (!draft.blocks.some((b) => b.by === sessionUserId && b.userId === userId)) {
      draft.blocks.push({ by: sessionUserId, userId });
    }
    if (taskId) {
      const task = draft.tasks.find((item) => item.id === taskId);
      if (
        task &&
        (task.customerId === sessionUserId || task.helperId === sessionUserId) &&
        (task.customerId === userId || task.helperId === userId)
      ) {
        const gate = canTransition(task, "flag_from_block", sessionUserId, userById(draft, sessionUserId)?.role ?? "customer");
        if (gate.ok) {
          patchTask(draft, task.id, {
            status: nextStatus("flag_from_block"),
            flaggedAt: new Date().toISOString(),
            flagReason: "Blocked by participant — safety review required",
          });
          const otherId = sessionUserId === task.customerId ? task.helperId : task.customerId;
          if (otherId) {
            notify(draft, {
              userId: otherId,
              titleEn: "This task was flagged after a block. Chat and new actions are restricted.",
              titleHi: "ब्लॉक के बाद यह काम फ़्लैग हो गया। चैट और नए ऐक्शन बंद हैं।",
              bodyEn: "Simulated safety alert · no auto-complete or payment",
              bodyHi: "सिम्युलेटेड सेफ्टी अलर्ट · ऑटो-कम्प्लीट/पेमेंट नहीं",
              href: `/task/${task.id}/work`,
            });
          }
        }
      }
    }
  });
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function unblockUser(sessionUserId: string, userId: string): Promise<MutateResult> {
  const state = await updateState((draft) => {
    draft.blocks = draft.blocks.filter((b) => !(b.by === sessionUserId && b.userId === userId));
  });
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function markRead(sessionUserId: string): Promise<MutateResult> {
  const state = await updateState((draft) => {
    draft.notifications = draft.notifications.map((item) =>
      item.userId === sessionUserId ? { ...item, read: true } : item,
    );
  });
  return { ok: true, state: toPublic(state, sessionUserId) };
}

export async function resetDemo(sessionUserId: string | null): Promise<MutateResult> {
  const state = await resetDatabase();
  const keep =
    sessionUserId && state.users.some((u) => u.id === sessionUserId) ? sessionUserId : null;
  return { ok: true, state: toPublic(state, keep) };
}
