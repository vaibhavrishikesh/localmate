"use client";

import { GeoChip, MapBoard, TaskCard } from "@/components/Bits";
import { EmptyState, ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { CATEGORIES, NEW_HELPER_TASKS, categoryLabel, isCategory, isClearedHelper, kmBetween, kmFromPoint, workerCategories } from "@/lib/catalog";
import { useGeo } from "@/lib/geo";
import { useStore } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function FeedPage() {
  const { user, state, blocked } = useStore();
  const { lang, t } = useLang();
  const geo = useGeo();
  const [mode, setMode] = useState<"list" | "map">("list");
  const [sort, setSort] = useState<"distance" | "price" | "time">("distance");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const gps = geo.status === "live" && geo.lat !== null && geo.lng !== null;

  const tasks = useMemo(() => {
    if (!user) return [];
    const whenRank: Record<string, number> = { "today-5": 0, "today-eve": 1, "tomorrow-10": 2, custom: 3 };
    const dist = (area: string) => (gps ? kmFromPoint(geo.lat!, geo.lng!, area) : kmBetween(user.area, area));
    return state.tasks
      .filter((task) => task.status === "looking")
      .filter((task) => task.customerId !== user.id)
      .filter((task) => !blocked(task.customerId))
      .filter((task) => user.role !== "helper" || workerCategories(user).includes(task.category))
      .filter((task) => category === "all" || task.category === category)
      .slice()
      .sort((a, b) => {
        if (sort === "price") return b.budget - a.budget;
        if (sort === "time") return (whenRank[a.whenId] ?? 9) - (whenRank[b.whenId] ?? 9);
        return dist(a.area) - dist(b.area);
      });
  }, [blocked, category, sort, state.tasks, user, gps, geo.lat, geo.lng]);

  if (user?.role === "helper" && !isClearedHelper(user)) {
    return (
      <Shell>
        <p className="kicker">{t("Not cleared yet", "अभी क्लीयर नहीं")}</p>
        <h2 className="display">{t("Tasks stay locked", "काम लॉक हैं")}</h2>
        <p className="sub">
          {t(
            "Visitors should only meet workers who finished setup. Phone, safety rules, at least one category, and an ID review are all required before this feed opens.",
            "विज़िटर सिर्फ़ उन्हीं वर्कर से मिलें जिन्होंने सेटअप पूरा किया हो। फ़ीड खुलने से पहले फ़ोन, सेफ्टी नियम, कम से कम एक कैटेगरी, और ID रिव्यू ज़रूरी हैं।",
          )}
        </p>
        <EmptyState glyph="🔒" title={t("Finish setup to unlock", "अनलॉक करने के लिए सेटअप पूरा करें")}>
          <Link href="/helper/setup" className="btn primary">{t("Open worker setup", "वर्कर सेटअप खोलें")}</Link>
        </EmptyState>
      </Shell>
    );
  }

  const visibleCategories = user?.role === "helper"
    ? CATEGORIES.filter((item) => workerCategories(user).includes(item.id))
    : CATEGORIES;

  return (
    <Shell>
      <div className="between">
        <p className="kicker">{t("Rishikesh", "ऋषिकेश")}</p>
        <GeoChip geo={geo} />
      </div>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 className="display">{t("Tasks near you", "आपके पास के काम")}</h2>
          <p className="meta">{tasks.length} {t("open", "खुले")}{gps ? ` · ${t("sorted by live distance", "लाइव दूरी से क्रम")}` : ""}</p>
        </div>
        <div className="seg" role="tablist" aria-label={t("View", "व्यू")}>
          <button type="button" role="tab" aria-selected={mode === "list"} className={mode === "list" ? "on" : ""} onClick={() => setMode("list")}>
            {t("List", "लिस्ट")}
          </button>
          <button type="button" role="tab" aria-selected={mode === "map"} className={mode === "map" ? "on" : ""} onClick={() => setMode("map")}>
            {t("Map", "मैप")}
          </button>
        </div>
      </div>

      {user?.role === "helper" && user.tasksCompleted < NEW_HELPER_TASKS && (
        <p className="info" style={{ marginTop: 12 }}>
          {t(
            "New worker limit: one open task, and only jobs up to ₹1,000 in your cleared categories.",
            "नए वर्कर की सीमा: एक खुला काम, और सिर्फ़ ₹1,000 तक के काम अपनी क्लीयर कैटेगरी में।",
          )}
        </p>
      )}
      {user?.role !== "helper" && (
        <p className="info" style={{ marginTop: 12 }}>
          {t("Helpers pick up tasks here. Open Rahul's view to try it.", "हेल्पर यहाँ से काम लेते हैं। राहुल का व्यू खोलकर देखें।")}
        </p>
      )}

      <div className="chips" style={{ margin: "14px 0 6px" }} aria-label={t("Sort", "क्रम")}>
        {(["distance", "price", "time"] as const).map((item) => (
          <button key={item} type="button" className={`chip ${sort === item ? "on" : ""}`} onClick={() => setSort(item)}>
            {item === "distance" ? t("Nearest", "सबसे पास") : item === "price" ? t("Highest pay", "ज़्यादा कीमत") : t("Soonest", "सबसे पहले")}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginBottom: 14 }} aria-label={t("Category", "कैटेगरी")}>
        <button type="button" className={`chip ${category === "all" ? "on" : ""}`} onClick={() => setCategory("all")}>
          {t("All", "सभी")}
        </button>
        {visibleCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${category === item.id ? "on" : ""}`}
            onClick={() => setCategory(isCategory(item.id) ? item.id : "all")}
          >
            {item.emoji} {categoryLabel(item, lang)}
          </button>
        ))}
      </div>

      {mode === "map" ? (
        <MapBoard tasks={tasks} geo={geo} />
      ) : (
        <div className="stack">
          {tasks.length === 0 && (
            <EmptyState glyph="🗺️" title={t("No tasks in this filter", "इस फ़िल्टर में कोई काम नहीं")} body={t("Try another category or check back soon.", "दूसरी कैटेगरी देखें या थोड़ी देर बाद आएँ।")}>
              <button type="button" className="btn ghost small" onClick={() => setCategory("all")}>
                <Icon d={ICONS.list} size={14} /> {t("Show all", "सभी दिखाएँ")}
              </button>
            </EmptyState>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} distanceFrom={user?.area} geo={geo} />
          ))}
        </div>
      )}
    </Shell>
  );
}
