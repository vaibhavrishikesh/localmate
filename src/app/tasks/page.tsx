"use client";

import { TaskCard } from "@/components/Bits";
import { EmptyState, Shell, useLang } from "@/components/Shell";
import { localize, money } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

type Tab = "open" | "done";

export default function MyTasksPage() {
  const { user, state } = useStore();
  const { lang, t } = useLang();
  const [tab, setTab] = useState<Tab>("open");
  if (!user) return <Shell><div /></Shell>;

  const posted = state.tasks.filter((task) => task.customerId === user.id);
  const jobs = state.tasks.filter((task) => task.helperId === user.id);
  const pending = state.offers.filter((offer) => offer.helperId === user.id);
  const pendingTasks = pending
    .map((offer) => state.tasks.find((task) => task.id === offer.taskId))
    .filter((task): task is Task => Boolean(task && task.status === "looking"));
  const all = user.role === "helper" ? jobs : posted;
  const open = all.filter((task) => task.status !== "completed");
  const done = all.filter((task) => task.status === "completed");
  const list = tab === "open" ? open : done;
  const isHelper = user.role === "helper";

  return (
    <Shell>
      <p className="kicker">{isHelper ? t("Your work", "आपका काम") : t("Your tasks", "आपके काम")}</p>
      <h2 className="display">{isHelper ? t("My jobs", "मेरे काम") : t("My tasks", "मेरे काम")}</h2>

      <div className="seg" role="tablist" style={{ marginTop: 12 }}>
        <button role="tab" type="button" aria-selected={tab === "open"} className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>
          {t("In progress", "चालू")} · {open.length + (isHelper ? pendingTasks.length : 0)}
        </button>
        <button role="tab" type="button" aria-selected={tab === "done"} className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          {t("Completed", "पूरे")} · {done.length}
        </button>
      </div>

      <div className="stack" style={{ marginTop: 14 }}>
        {tab === "open" && isHelper && pendingTasks.map((task) => (
          <Link key={task.id} href={`/task/${task.id}`} className="card hover">
            <div className="between">
              <span className="pill wait">{t("Offer sent", "ऑफ़र भेजा")}</span>
              <span className="price" style={{ fontSize: 20 }}>{money(pending.find((offer) => offer.taskId === task.id)?.amount ?? task.budget)}</span>
            </div>
            <h3 style={{ marginTop: 8 }}>{localize(task.title, task.titleHi, lang)}</h3>
            <p className="meta">{t("Waiting for the customer to decide", "कस्टमर के फैसले का इंतज़ार")}</p>
          </Link>
        ))}
        {list.length === 0 && (tab === "done" || !isHelper || pendingTasks.length === 0) && (
          <EmptyState
            glyph={tab === "done" ? "🏁" : "📋"}
            title={tab === "done" ? t("No completed tasks yet", "अभी कोई पूरा काम नहीं") : t("Nothing in progress", "अभी कुछ चालू नहीं")}
            body={isHelper ? t("Find a nearby task in the feed.", "फ़ीड में आस-पास का काम ढूँढें।") : t("Post a task and cleared locals will apply.", "काम पोस्ट करें, क्लीयर लोकल अप्लाई करेंगे।")}
          >
            {tab === "open" && !isHelper && <Link className="btn primary" href="/new">{t("Post a task", "काम पोस्ट करें")}</Link>}
            {tab === "open" && isHelper && <Link className="btn primary" href="/feed">{t("Find a task", "काम ढूँढें")}</Link>}
          </EmptyState>
        )}
        {list.map((task) => <TaskCard key={task.id} task={task} distanceFrom={user.area} />)}
      </div>
    </Shell>
  );
}
