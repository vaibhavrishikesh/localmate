"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { detectLang } from "./i18n";
import type {
  AppState,
  CategoryId,
  Lang,
  NewTaskInput,
  Payment,
  Role,
  User,
} from "./types";

const UI_KEY = "localmate-ui-lang";

const emptyState = (): AppState => ({
  users: [],
  tasks: [],
  offers: [],
  messages: [],
  notifications: [],
  reports: [],
  blocks: [],
  payments: [],
  sessionUserId: null,
});

interface Store {
  ready: boolean;
  state: AppState;
  user: User | null;
  signIn: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: { name: string; phone: string; email: string; role: Role; language: Lang }) => Promise<string>;
  setLanguage: (language: Lang) => void;
  saveWorkerSetup: (categories: CategoryId[]) => Promise<void>;
  requestIdentityReview: () => Promise<void>;
  resetDemo: () => Promise<void>;
  createTask: (input: NewTaskInput) => Promise<{ ok: true; id: string } | { ok: false; error: "banned" | "invalid" }>;
  sendOffer: (taskId: string, amount: number, note: string) => Promise<void>;
  acceptOffer: (offerId: string) => Promise<void>;
  startTask: (taskId: string) => Promise<void>;
  shareLocation: (taskId: string) => Promise<void>;
  /** Helper marks done → awaiting customer confirmation. */
  completeTask: (taskId: string) => Promise<void>;
  confirmCompletion: (taskId: string) => Promise<void>;
  reportTaskProblem: (taskId: string, reason: string) => Promise<void>;
  cancelTask: (taskId: string, reasonId: string) => Promise<void>;
  /** Places locked agreed amount into server hold. Amount is not client-chosen. */
  holdPayment: (taskId: string) => Promise<void>;
  /** @deprecated use holdPayment */
  payTask: (taskId: string) => Promise<void>;
  /** Customer confirms review → releases hold. */
  reviewTask: (taskId: string, stars: number, text: string) => Promise<void>;
  sendMessage: (taskId: string, text: string) => Promise<void>;
  reportUser: (userId: string, reason: string, taskId?: string) => Promise<void>;
  blockUser: (userId: string, taskId?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  markRead: () => Promise<void>;
  blocked: (userId: string) => boolean;
  iBlocked: (userId: string) => boolean;
  paymentFor: (taskId: string) => Payment | undefined;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

function applyPublic(raw: Partial<AppState> & { sessionUserId?: string | null }, uiLang: Lang): AppState {
  return {
    users: raw.users ?? [],
    tasks: raw.tasks ?? [],
    offers: raw.offers ?? [],
    messages: raw.messages ?? [],
    notifications: raw.notifications ?? [],
    reports: raw.reports ?? [],
    blocks: raw.blocks ?? [],
    payments: raw.payments ?? [],
    sessionUserId: raw.sessionUserId ?? null,
    uiLang,
  };
}

async function fetchState(uiLang: Lang): Promise<AppState> {
  const res = await fetch("/api/state", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load state");
  const data = await res.json();
  return applyPublic(data, uiLang);
}

async function postAuth(body: Record<string, unknown>) {
  const res = await fetch("/api/auth", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Auth failed");
  return data;
}

async function mutate(body: Record<string, unknown>) {
  const res = await fetch("/api/mutate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data as { ok: true; state: AppState; extra?: { id?: string } };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const lang = state.uiLang || detectLang();
    const next = await fetchState(lang);
    setState((prev) => ({ ...next, uiLang: prev.uiLang || next.uiLang || lang }));
  }, [state.uiLang]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = typeof window !== "undefined" ? localStorage.getItem(UI_KEY) : null;
      const lang = (saved as Lang) || detectLang();
      try {
        const next = await fetchState(lang);
        if (!cancelled) {
          setState({ ...next, uiLang: lang });
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setState({ ...emptyState(), uiLang: lang });
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !state.uiLang) return;
    localStorage.setItem(UI_KEY, state.uiLang);
  }, [ready, state.uiLang]);

  const user = state.users.find((item) => item.id === state.sessionUserId) ?? null;

  const applyMutate = useCallback(async (body: Record<string, unknown>) => {
    const data = await mutate(body);
    setState((prev) => applyPublic(data.state, prev.uiLang || detectLang()));
    return data;
  }, []);

  const api = useMemo<Store>(() => {
    const blocked = (userId: string) =>
      state.blocks.some(
        (block) =>
          (block.by === state.sessionUserId && block.userId === userId) ||
          (block.by === userId && block.userId === state.sessionUserId),
      );
    const iBlocked = (userId: string) =>
      state.blocks.some((block) => block.by === state.sessionUserId && block.userId === userId);

    return {
      ready,
      state,
      user,
      blocked,
      iBlocked,
      paymentFor: (taskId) => state.payments.find((p) => p.taskId === taskId),
      refresh,
      signIn: async (userId) => {
        const data = await postAuth({ action: "signin", userId });
        setState((prev) => applyPublic(data.state, prev.uiLang || detectLang()));
      },
      signOut: async () => {
        await postAuth({ action: "signout" });
        setState((prev) => ({ ...prev, sessionUserId: null }));
      },
      signUp: async (input) => {
        const data = await postAuth({ action: "signup", ...input });
        setState((prev) => applyPublic(data.state, prev.uiLang || input.language));
        return data.userId as string;
      },
      setLanguage: (language) => setState((prev) => ({ ...prev, uiLang: language })),
      saveWorkerSetup: async (categories) => {
        await applyMutate({ action: "saveWorkerSetup", categories });
      },
      requestIdentityReview: async () => {
        await applyMutate({ action: "requestIdentityReview" });
      },
      resetDemo: async () => {
        await applyMutate({ action: "resetDemo" });
      },
      createTask: async (input) => {
        try {
          const data = await applyMutate({ action: "createTask", task: input });
          const id = data.extra?.id;
          if (!id) return { ok: false as const, error: "invalid" as const };
          return { ok: true as const, id };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg === "banned") return { ok: false as const, error: "banned" as const };
          return { ok: false as const, error: "invalid" as const };
        }
      },
      sendOffer: async (taskId, amount, note) => {
        await applyMutate({ action: "sendOffer", taskId, amount, note });
      },
      acceptOffer: async (offerId) => {
        await applyMutate({ action: "acceptOffer", offerId });
      },
      startTask: async (taskId) => {
        await applyMutate({ action: "startTask", taskId });
      },
      shareLocation: async (taskId) => {
        await applyMutate({ action: "shareLocation", taskId });
      },
      completeTask: async (taskId) => {
        await applyMutate({ action: "completeTask", taskId });
      },
      confirmCompletion: async (taskId) => {
        await applyMutate({ action: "confirmCompletion", taskId });
      },
      reportTaskProblem: async (taskId, reason) => {
        await applyMutate({ action: "reportTaskProblem", taskId, reason });
      },
      cancelTask: async (taskId, reasonId) => {
        await applyMutate({ action: "cancelTask", taskId, reasonId });
      },
      holdPayment: async (taskId) => {
        await applyMutate({ action: "holdPayment", taskId });
      },
      payTask: async (taskId) => {
        await applyMutate({ action: "holdPayment", taskId });
      },
      reviewTask: async (taskId, stars, text) => {
        await applyMutate({ action: "confirmAndReview", taskId, stars, text });
      },
      sendMessage: async (taskId, text) => {
        await applyMutate({ action: "sendMessage", taskId, text });
      },
      reportUser: async (userId, reason, taskId) => {
        await applyMutate({ action: "reportUser", userId, reason, taskId });
      },
      blockUser: async (userId, taskId) => {
        await applyMutate({ action: "blockUser", userId, taskId });
      },
      unblockUser: async (userId) => {
        await applyMutate({ action: "unblockUser", userId });
      },
      markRead: async () => {
        await applyMutate({ action: "markRead" });
      },
    };
  }, [ready, state, user, refresh, applyMutate]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Store missing");
  return store;
}
