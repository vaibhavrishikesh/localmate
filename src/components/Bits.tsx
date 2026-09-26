"use client";

import {
  AREAS,
  areaById,
  areaName,
  categoryById,
  categoryLabel,
  kmBetween,
  kmFromPoint,
  localize,
  mapsDirectionsUrl,
  mapsEmbedUrl,
  mapsPlaceUrl,
  money,
  tx,
} from "@/lib/catalog";
import { useGeo, type GeoState } from "@/lib/geo";
import { useStore } from "@/lib/store";
import type { Lang, Task, TaskStatus, User } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { ICONS, Icon, useLang } from "./Shell";

const AVATAR = ["#1e4d3b", "#b6432b", "#2f3d4a", "#8a5a1c", "#315c8a"];

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const index = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR.length;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, background: AVATAR[index], fontSize: size * 0.34 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function statusLabel(status: TaskStatus, lang: Lang) {
  const labels: Record<TaskStatus, [string, string]> = {
    looking: ["Looking", "खोज रहे हैं"],
    matched: ["Matched", "मिल गया"],
    active: ["In progress", "चल रहा है"],
    pay: ["Pay", "पेमेंट"],
    review: ["Review", "रिव्यू"],
    completed: ["Done", "पूरा"],
  };
  return tx(lang, labels[status][0], labels[status][1]);
}

export function StatusPill({ status }: { status: TaskStatus }) {
  const { lang } = useLang();
  const tone = status === "looking" || status === "review" ? "wait" : status === "completed" ? "done" : "live";
  return <span className={`pill ${tone}`}>{statusLabel(status, lang)}</span>;
}

const ORDER: TaskStatus[] = ["matched", "active", "pay", "review", "completed"];

export function StatusSteps({ status }: { status: TaskStatus }) {
  const { lang } = useLang();
  const at = ORDER.indexOf(status);
  return (
    <ul className="steps" aria-label="Task progress">
      {ORDER.map((step, index) => (
        <li key={step} className={index < at ? "done" : index === at ? "now" : ""}>
          <i />
          {statusLabel(step, lang)}
        </li>
      ))}
    </ul>
  );
}

export function TrustLine({ person }: { person: User }) {
  const { t } = useLang();
  const fresh = person.tasksCompleted === 0;
  return (
    <p className="meta" style={{ margin: 0 }}>
      {fresh ? t("New", "नए") : <span style={{ color: "var(--amber-deep)", fontWeight: 700 }}>★ {person.rating.toFixed(1)}</span>}
      {" · "}
      {person.tasksCompleted} {t("tasks", "काम")}
      {" · "}
      {person.responseRate}% {t("response", "जवाब")}
    </p>
  );
}

export function Stats({ person }: { person: User }) {
  const { t } = useLang();
  return (
    <div className="stats">
      <div className="stat"><strong>{person.tasksCompleted === 0 ? "–" : person.rating.toFixed(1)}</strong><span>{t("Rating", "रेटिंग")}</span></div>
      <div className="stat"><strong>{person.tasksCompleted}</strong><span>{t("Tasks done", "काम पूरे")}</span></div>
      <div className="stat"><strong>{person.responseRate}%</strong><span>{t("Response", "जवाब")}</span></div>
    </div>
  );
}

export function TaskCard({ task, distanceFrom, geo }: { task: Task; distanceFrom?: string; geo?: GeoState }) {
  const { lang, t } = useLang();
  const { state } = useStore();
  const category = categoryById(task.category);
  const customer = state.users.find((person) => person.id === task.customerId);
  const title = localize(task.title, task.titleHi, lang);
  const when = lang === "hi" && task.whenLabelHi ? task.whenLabelHi : task.whenLabel;
  const route = task.toArea
    ? `${areaName(task.area, lang)} → ${areaName(task.toArea, lang)}`
    : areaName(task.area, lang);
  const km = geo?.status === "live" && geo.lat !== null && geo.lng !== null
    ? kmFromPoint(geo.lat, geo.lng, task.area)
    : distanceFrom
      ? kmBetween(distanceFrom, task.area)
      : null;
  return (
    <Link href={`/task/${task.id}`} className="task-card card">
      <div className="between">
        <span className="pill">
          {category.emoji} {categoryLabel(category, lang)}
        </span>
        <StatusPill status={task.status} />
      </div>
      <div className="between" style={{ alignItems: "flex-end", marginTop: 10 }}>
        <div className="grow">
          <h3>{title}</h3>
          <p className="meta">
            {customer ? `${customer.name} · ` : ""}
            {route}
            <br />
            {when}
            {km !== null ? ` · ${km} km${geo?.status === "live" ? ` ${t("from you", "आपसे")}` : ""}` : ""}
            {" · "}
            {task.priceMode === "fixed" ? t("Fixed", "फिक्स्ड") : t("Budget", "बजट")}
          </p>
        </div>
        <strong className="price">{money(task.agreedAmount ?? task.budget)}</strong>
      </div>
    </Link>
  );
}

export function GeoChip({ geo }: { geo: GeoState }) {
  const { t } = useLang();
  if (geo.status === "unavailable") return null;
  if (geo.status === "live" && geo.lat !== null && geo.lng !== null) {
    const nearest = AREAS.slice().sort((a, b) => kmFromPoint(geo.lat!, geo.lng!, a.id) - kmFromPoint(geo.lat!, geo.lng!, b.id))[0];
    const km = kmFromPoint(geo.lat, geo.lng, nearest.id);
    return (
      <span className="pill live" title={`±${Math.round(geo.accuracy ?? 0)} m`}>
        <Icon d={ICONS.pin} size={12} />
        {t("GPS live", "GPS चालू")} · {km < 1 ? nearest.en : `${km} km ${t("from", "से")} ${nearest.en}`}
      </span>
    );
  }
  if (geo.status === "denied") return <span className="pill">{t("Location off", "लोकेशन बंद")}</span>;
  if (geo.status === "asking") return <span className="pill wait">{t("Finding you…", "लोकेशन ढूँढ रहे हैं…")}</span>;
  return (
    <button type="button" className="chip" onClick={geo.request} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Icon d={ICONS.pin} size={13} />
      {t("Use my GPS", "मेरा GPS इस्तेमाल करें")}
    </button>
  );
}

/** Google Maps embed of a meeting point with live distance and one-tap navigation. */
export function LiveMap({ areaId, height = 220, showNavigate = true }: { areaId: string; height?: number; showNavigate?: boolean }) {
  const { lang, t } = useLang();
  const geo = useGeo();
  const area = areaById(areaId);
  const live = geo.status === "live" && geo.lat !== null && geo.lng !== null;
  const km = live ? kmFromPoint(geo.lat!, geo.lng!, areaId) : null;
  const minutes = km !== null ? Math.max(1, Math.round((km / 4.5) * 60)) : null;
  return (
    <div className="card flat" style={{ padding: 0, overflow: "hidden" }}>
      <iframe
        title={`${area.en} map`}
        src={mapsEmbedUrl(area.lat, area.lng, 16)}
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="stack" style={{ padding: 14, gap: 10 }}>
        <div className="between">
          <div>
            <strong>{areaName(areaId, lang)}</strong>
            <p className="meta">
              {km !== null
                ? t(`${km} km from you · about ${minutes} min on foot`, `आपसे ${km} km · पैदल लगभग ${minutes} मिनट`)
                : t("Turn on GPS to see how far you are.", "दूरी देखने के लिए GPS चालू करें।")}
            </p>
          </div>
          <GeoChip geo={geo} />
        </div>
        {showNavigate && (
          <div className="row">
            <a className="btn primary grow" href={mapsDirectionsUrl(area.lat, area.lng)} target="_blank" rel="noopener noreferrer">
              <Icon d={ICONS.pin} size={16} />
              {t("Navigate", "नेविगेट करें")}
            </a>
            <a className="btn ghost" href={mapsPlaceUrl(area.lat, area.lng)} target="_blank" rel="noopener noreferrer">
              {t("Open in Maps", "Maps में खोलें")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/** Feed map: Google Maps around the helper's live position (or Rishikesh), with task pins listed for navigation. */
export function MapBoard({ tasks, geo }: { tasks: Task[]; geo: GeoState }) {
  const { lang, t } = useLang();
  const live = geo.status === "live" && geo.lat !== null && geo.lng !== null;
  const center = live ? { lat: geo.lat!, lng: geo.lng! } : { lat: 30.122, lng: 78.316 };
  return (
    <div className="stack">
      <div className="card flat" style={{ padding: 0, overflow: "hidden" }}>
        <iframe
          title="Rishikesh map"
          src={mapsEmbedUrl(center.lat, center.lng, live ? 15 : 14)}
          width="100%"
          height={260}
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="between" style={{ padding: "10px 14px" }}>
          <span className="meta">{live ? t("Centred on you", "आप पर केंद्रित") : t("Rishikesh", "ऋषिकेश")}</span>
          <GeoChip geo={geo} />
        </div>
      </div>
      {tasks.map((task) => {
        const area = areaById(task.area);
        const km = live ? kmFromPoint(geo.lat!, geo.lng!, task.area) : null;
        return (
          <div key={task.id} className="card between">
            <Link href={`/task/${task.id}`} className="grow">
              <strong style={{ display: "block" }}>{localize(task.title, task.titleHi, lang)}</strong>
              <span className="meta">{areaName(task.area, lang)}{km !== null ? ` · ${km} km` : ""} · {money(task.budget)}</span>
            </Link>
            <a className="btn dark small" href={mapsDirectionsUrl(area.lat, area.lng)} target="_blank" rel="noopener noreferrer">
              {t("Navigate", "नेविगेट")}
            </a>
          </div>
        );
      })}
    </div>
  );
}

export function SafetySheet({
  userId,
  taskId,
  onClose,
}: {
  userId: string;
  taskId?: string;
  onClose: () => void;
}) {
  const { reportUser, blockUser } = useStore();
  const { t } = useLang();
  const [sent, setSent] = useState("");
  const reasons = [
    [t("No-show", "नहीं आया"), "No-show"],
    [t("Unsafe behaviour", "असुरक्षित व्यवहार"), "Unsafe behaviour"],
    [t("Spam", "स्पैम"), "Spam"],
    [t("Wrong task", "गलत काम"), "Wrong task"],
  ] as const;

  return (
    <div className="sheet" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("Safety", "सुरक्षा")}>
      <div className="panel stack" onClick={(event) => event.stopPropagation()}>
        <h2 className="display" style={{ fontSize: 26 }}>{t("Safety", "सुरक्षा")}</h2>
        <p className="sub">{t("If you feel unsafe, leave and call local emergency services.", "अगर असुरक्षित लगे, तो काम छोड़ें और इमरजेंसी नंबर पर कॉल करें।")}</p>
        <div className="row">
          <a className="btn danger grow" href="tel:112">{t("Call 112", "112 पर कॉल करें")}</a>
          <a className="btn ghost grow" href="tel:108">{t("Ambulance 108", "एम्बुलेंस 108")}</a>
        </div>
        <span className="label" style={{ marginTop: 6 }}>{t("Report", "रिपोर्ट")}</span>
        <div className="wrap">
          {reasons.map(([label, reason]) => (
            <button
              key={reason}
              type="button"
              className={`chip ${sent === reason ? "on" : ""}`}
              onClick={async () => {
                await reportUser(userId, reason, taskId);
                setSent(reason);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {sent && <p className="ok">{t("Report sent to LocalMate.", "रिपोर्ट LocalMate को भेज दी गई।")}</p>}
        <button
          type="button"
          className="btn dark wide"
          onClick={async () => {
            await blockUser(userId);
            onClose();
          }}
        >
          {t("Block this person", "इस व्यक्ति को ब्लॉक करें")}
        </button>
        <button type="button" className="btn ghost wide" onClick={onClose}>{t("Close", "बंद करें")}</button>
      </div>
    </div>
  );
}
