"use client";

import { Avatar, GeoChip, StatusPill, TaskCard, TrustLine } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { CATEGORIES, areaName, categoryLabel, isClearedHelper, kmBetween, kmFromPoint, localize, taskHref } from "@/lib/catalog";
import { useGeo } from "@/lib/geo";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const { user, state, blocked } = useStore();
  const { lang, t } = useLang();
  const geo = useGeo();
  const [query, setQuery] = useState("");
  if (!user) return <Shell><div /></Shell>;

  const mine = state.tasks.filter((task) => task.customerId === user.id && task.status !== "completed");
  const live = mine[0];
  const helpers = state.users.filter((person) => isClearedHelper(person) && !blocked(person.id));
  const gps = geo.status === "live" && geo.lat !== null && geo.lng !== null;
  const q = query.trim().toLowerCase();
  const shown = q
    ? CATEGORIES.filter((category) => `${category.en} ${category.hi} ${categoryLabel(category, lang)}`.toLowerCase().includes(q))
    : CATEGORIES;
  const first = user.name.split(" ")[0];

  return (
    <Shell>
      <div className="between">
        <p className="kicker">{t("Hello {name}", "नमस्ते {name}", { name: first })}</p>
        <GeoChip geo={geo} />
      </div>
      <h2 className="display">{t("What do you need help with?", "किस काम में मदद चाहिए?")}</h2>
      <p className="sub">{t("Post a task, set your price, pick a trusted local.", "काम पोस्ट करें, कीमत रखें, भरोसेमंद लोकल चुनें।")}</p>

      <label className="search">
        <Icon d={ICONS.search} size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search: luggage, scooter, guide…", "खोजें: सामान, स्कूटर, गाइड…")}
          aria-label={t("Search categories", "कैटेगरी खोजें")}
        />
      </label>

      {user.role === "customer" ? (
        <Link href="/new" className="cta">
          <span className="plus" aria-hidden="true">+</span>
          <span>
            <strong>{t("Post a task", "काम पोस्ट करें")}</strong>
            <span className="hint">{t("Takes a minute · you set the price", "एक मिनट लगता है · कीमत आप रखें")}</span>
          </span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
      ) : (
        <Link href={isClearedHelper(user) ? "/feed" : "/helper/setup"} className="cta">
          <span className="plus" aria-hidden="true">📍</span>
          <span>
            <strong>{isClearedHelper(user) ? t("See tasks near you", "पास के काम देखें") : t("Finish worker setup", "वर्कर सेटअप पूरा करें")}</strong>
            <span className="hint">{t("Helpers earn 90% of every task", "हेल्पर को हर काम का 90% मिलता है")}</span>
          </span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
      )}

      {live && (
        <Link href={taskHref(live.status, live.id)} className="banner" style={{ marginTop: 12 }}>
          <span className="between">
            <span className="pill">{t("Your task", "आपका काम")}</span>
            <StatusPill status={live.status} />
          </span>
          <strong style={{ display: "block", marginTop: 8, fontSize: 16 }}>{localize(live.title, live.titleHi, lang)}</strong>
          <span className="meta">{areaName(live.area, lang)} · {t("Tap to open", "खोलने के लिए टैप करें")}</span>
        </Link>
      )}

      <div className="section">
        <h3>{t("Categories", "कैटेगरी")}</h3>
        {q && <button type="button" className="top-link" style={{ margin: 0 }} onClick={() => setQuery("")}>{t("Clear", "साफ़ करें")}</button>}
      </div>
      {shown.length === 0 ? (
        <p className="meta">{t("No category matches. Try another word, or post it under Other.", "कोई कैटेगरी नहीं मिली। दूसरा शब्द लिखें, या Other में पोस्ट करें।")}</p>
      ) : (
        <div className="cats">
          {shown.map((category) => (
            <Link key={category.id} href={`/new?category=${category.id}`} className="cat">
              <em aria-hidden="true">{category.emoji}</em>
              <strong>{categoryLabel(category, lang)}</strong>
            </Link>
          ))}
        </div>
      )}

      <div className="section">
        <h3>{t("Trusted locals nearby", "पास के भरोसेमंद लोकल")}</h3>
        <span className="meta">{gps ? t("from you", "आपसे") : areaName(user.area, lang)}</span>
      </div>
      <div className="people">
        {helpers.map((person) => {
          const km = gps ? kmFromPoint(geo.lat!, geo.lng!, person.area) : kmBetween(user.area, person.area);
          return (
            <Link key={person.id} href={`/people/${person.id}`} className="person">
              <Avatar name={person.name} />
              <strong style={{ display: "block", marginTop: 10 }}>{person.name.split(" ")[0]}</strong>
              <TrustLine person={person} />
              <p className="meta">{km} km · {areaName(person.area, lang)}</p>
              {person.identityVerified && <span className="badge" style={{ marginTop: 6 }}>{t("ID checked", "ID जाँची गई")}</span>}
            </Link>
          );
        })}
      </div>

      {mine.length > 1 && (
        <>
          <div className="section">
            <h3>{t("Your other tasks", "आपके अन्य काम")}</h3>
            <Link href="/tasks">{t("All", "सभी")}</Link>
          </div>
          <div className="stack">
            {mine.slice(1).map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        </>
      )}
    </Shell>
  );
}
