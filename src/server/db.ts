import { promises as fs } from "fs";
import path from "path";
import { seedState } from "@/lib/seed";
import type { ServerState, ServerUser } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "localmate-db.json");

const g = globalThis as typeof globalThis & { __localmateDb?: ServerState; __localmateQueue?: Promise<unknown> };

let queue: Promise<unknown> = g.__localmateQueue ?? Promise.resolve();
g.__localmateQueue = queue;

function withIdentity(users: ReturnType<typeof seedState>["users"]): ServerUser[] {
  return users.map((user) => ({
    ...user,
    identityReviewStatus: user.identityVerified ? ("cleared" as const) : ("none" as const),
  }));
}

function seedServer(): ServerState {
  const seed = seedState();
  return {
    users: withIdentity(seed.users),
    tasks: seed.tasks,
    offers: seed.offers,
    messages: seed.messages,
    notifications: seed.notifications,
    reports: seed.reports,
    blocks: seed.blocks,
    payments: [
      {
        id: "pay-photo",
        taskId: "task-photo",
        customerId: "maya",
        helperId: "priya",
        amount: 700,
        fee: 70,
        helperAmount: 630,
        status: "released",
        heldAt: seed.tasks.find((t) => t.id === "task-photo")?.createdAt ?? new Date().toISOString(),
        releasedAt: seed.tasks.find((t) => t.id === "task-photo")?.createdAt,
      },
    ],
  };
}

async function ensureLoaded(): Promise<ServerState> {
  if (g.__localmateDb) return g.__localmateDb;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as ServerState;
    if (!parsed.users || !parsed.tasks || !Array.isArray(parsed.payments)) {
      g.__localmateDb = seedServer();
    } else {
      g.__localmateDb = {
        ...parsed,
        payments: parsed.payments ?? [],
        users: parsed.users.map((user) => ({
          ...user,
          identityReviewStatus: user.identityReviewStatus ?? (user.identityVerified ? "cleared" : "none"),
        })),
      };
    }
  } catch {
    g.__localmateDb = seedServer();
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DB_FILE, JSON.stringify(g.__localmateDb, null, 2), "utf8");
    } catch {
      // Read-only / serverless — keep in-memory only
    }
  }
  return g.__localmateDb!;
}

async function persist(state: ServerState) {
  g.__localmateDb = state;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Serverless filesystems are ephemeral/read-only — memory is the source of truth.
  }
}

export function runExclusive<T>(fn: (state: ServerState) => Promise<T> | T): Promise<T> {
  const next = queue.then(async () => {
    const state = await ensureLoaded();
    return fn(state);
  });
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  g.__localmateQueue = queue;
  return next;
}

export async function readState(): Promise<ServerState> {
  return runExclusive(async (state) => structuredClone(state));
}

export async function writeState(state: ServerState): Promise<ServerState> {
  return runExclusive(async () => {
    const copy = structuredClone(state);
    await persist(copy);
    return structuredClone(copy);
  });
}

export async function updateState(mutator: (state: ServerState) => ServerState | void): Promise<ServerState> {
  return runExclusive(async (state) => {
    const draft = structuredClone(state);
    const result = mutator(draft) ?? draft;
    await persist(result);
    return structuredClone(result);
  });
}

export async function resetDatabase(): Promise<ServerState> {
  return runExclusive(async () => {
    const fresh = seedServer();
    await persist(fresh);
    return structuredClone(fresh);
  });
}
