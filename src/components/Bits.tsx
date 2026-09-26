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
  mapsEmbedUrl,
  money,
  tx,
} from "@/lib/catalog";
import { useGeo, type GeoState } from "@/lib/geo";
import {
  ARRIVAL_RADIUS_M,
  FAR_FROM_PIN_M,
  WEAK_ACCURACY_M,
  lockedDirectionsUrl,
  lockedPlaceUrl,
  metersFromPin,
  pinProximity,
} from "@/lib/navSafety";
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
    awaiting_customer_confirmation: ["Awaiting confirm", "कन्फ़र्म बाकी"],
    pay: ["Pay", "पेमेंट"],
    review: ["Review", "रिव्यू"],
    completed: ["Done", "पूरा"],
    cancelled: ["Cancelled", "रद्द"],
    flagged: ["Flagged", "फ़्लैग"],
  };
  return tx(lang, labels[status][0], labels[status][1]);
}

export function StatusPill({ status }: { status: TaskStatus }) {
  const { lang } = useLang();
  const tone =
    status === "looking" || status === "review" || status === "awaiting_customer_confirmation"
      ? "wait"
      : status === "completed"
        ? "done"
        : status === "cancelled" || status === "flagged"
          ? "wait"
          : "live";
  return <span className={`pill ${tone}`}>{statusLabel(status, lang)}</span>;
}

const ORDER: TaskStatus[] = ["matched", "active", "awaiting_customer_confirmation", "pay", "review", "completed"];

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

function proximityLabel(
  prox: ReturnType<typeof pinProximity>,
  meters: number | null,
  t: (en: string, hi: string) => string,
) {
  if (prox === "at_pin") {
    return t(`At official pin (±${ARRIVAL_RADIUS_M} m)`, `आधिकारिक पिन पर (±${ARRIVAL_RADIUS_M} मी)`);
  }
  if (prox === "nearby" && meters != null) {
    return t(`~${Math.round(meters)} m from pin — keep going`, `पिन से ~${Math.round(meters)} मी — आगे बढ़ें`);
  }
  if (prox === "far" && meters != null) {
    const km = (meters / 1000).toFixed(meters >= 1000 ? 1 : 2);
    return t(`${km} km from official pin — do not follow chat pins`, `आधिकारिक पिन से ${km} km — चैट पिन मत मानो`);
  }
  return t("Turn on GPS to verify you are at the pin.", "पिन पर होने की पुष्टि के लिए GPS चालू करें।");
}

/**
 * Meeting-point map. When `safeHelper` is on, navigation is locked to catalog
 * coords only, GPS proximity is shown, and dual meet/drop-off is supported.
 */
export function LiveMap({
  areaId,
  toAreaId,
  height = 220,
  showNavigate = true,
  safeHelper = false,
  arrivedAt,
  onConfirmArrival,
  confirmingArrival,
}: {
  areaId: string;
  toAreaId?: string;
  height?: number;
  showNavigate?: boolean;
  /** Helper anti-bait mode: locked pin + GPS check + dual nav. */
  safeHelper?: boolean;
  arrivedAt?: string;
  onConfirmArrival?: (coords: { lat: number; lng: number; accuracy: number | null } | null) => void;
  confirmingArrival?: boolean;
}) {
  const { lang, t } = useLang();
  const geo = useGeo();
  const area = areaById(areaId);
  const live = geo.status === "live" && geo.lat !== null && geo.lng !== null;
  const km = live ? kmFromPoint(geo.lat!, geo.lng!, areaId) : null;
  const minutes = km !== null ? Math.max(1, Math.round((km / 4.5) * 60)) : null;
  const meters = live ? metersFromPin(geo.lat!, geo.lng!, areaId) : null;
  const prox = pinProximity(geo.lat, geo.lng, areaId);
  const weakGps = live && geo.accuracy != null && geo.accuracy > WEAK_ACCURACY_M;
  const origin = live ? { originLat: geo.lat!, originLng: geo.lng! } : undefined;
  const walkUrl = lockedDirectionsUrl(areaId, { ...origin, mode: "walking" });
  const driveUrl = lockedDirectionsUrl(areaId, { ...origin, mode: "driving" });
  const dropUrl = toAreaId ? lockedDirectionsUrl(toAreaId, { ...origin, mode: "driving" }) : null;
  const canConfirmGps = prox === "at_pin" && !weakGps;

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
        <div className="between" style={{ alignItems: "flex-start" }}>
          <div className="grow">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <strong>{areaName(areaId, lang)}</strong>
              {safeHelper && <span className="pill live">{t("Locked pin", "लॉक पिन")}</span>}
              {arrivedAt && <span className="badge">{t("Arrival confirmed", "पहुँच कन्फ़र्म")}</span>}
            </div>
            <p className="meta">
              {safeHelper
                ? proximityLabel(prox, meters, t)
                : km !== null
                  ? t(`${km} km from you · about ${minutes} min on foot`, `आपसे ${km} km · पैदल लगभग ${minutes} मिनट`)
                  : t("Turn on GPS to see how far you are.", "दूरी देखने के लिए GPS चालू करें।")}
            </p>
            {safeHelper && (
              <p className="meta" style={{ marginTop: 4 }}>
                {t("Official coords", "आधिकारिक निर्देशांक")}: {area.lat.toFixed(5)}, {area.lng.toFixed(5)}
              </p>
            )}
          </div>
          <GeoChip geo={geo} />
        </div>

        {safeHelper && prox === "far" && (
          <p className="note" role="alert">
            {t(
              `You are more than ${Math.round(FAR_FROM_PIN_M / 1000 * 10) / 10} km from the task pin. Ignore any new pin from chat, WhatsApp, or SMS — only this map is trusted.`,
              `आप काम के पिन से ${Math.round(FAR_FROM_PIN_M / 1000 * 10) / 10} km से ज़्यादा दूर हैं। चैट/WhatsApp/SMS का नया पिन न मानें — सिर्फ़ यही मैप भरोसेमंद है।`,
            )}
          </p>
        )}
        {safeHelper && weakGps && (
          <p className="info">
            {t(
              `GPS accuracy is weak (±${Math.round(geo.accuracy ?? 0)} m). Wait outdoors a few seconds before confirming arrival.`,
              `GPS कमज़ोर है (±${Math.round(geo.accuracy ?? 0)} मी)। पहुँच कन्फ़र्म से पहले बाहर थोड़ी देर रुकें।`,
            )}
          </p>
        )}

        {showNavigate && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <a className="btn primary grow" href={walkUrl} target="_blank" rel="noopener noreferrer">
                <Icon d={ICONS.pin} size={16} />
                {t("Walk to meet pin", "मिलने के पिन तक पैदल")}
              </a>
              <a className="btn dark grow" href={driveUrl} target="_blank" rel="noopener noreferrer">
                {t("Drive / scooter", "गाड़ी / स्कूटर")}
              </a>
            </div>
            {dropUrl && toAreaId && (
              <a className="btn ghost wide" href={dropUrl} target="_blank" rel="noopener noreferrer">
                <Icon d={ICONS.pin} size={15} />
                {t("Then navigate to drop-off", "फिर ड्रॉप-ऑफ़ पर नेविगेट")}: {areaName(toAreaId, lang)}
              </a>
            )}
            <a className="btn ghost small" href={lockedPlaceUrl(areaId)} target="_blank" rel="noopener noreferrer">
              {t("Open locked pin in Maps", "लॉक पिन Maps में खोलें")}
            </a>
          </div>
        )}

        {safeHelper && onConfirmArrival && !arrivedAt && (
          <div className="stack" style={{ gap: 8 }}>
            <button
              className="btn gold wide"
              type="button"
              disabled={confirmingArrival || !canConfirmGps}
              onClick={() => {
                if (!live) {
                  geo.request();
                  return;
                }
                onConfirmArrival({ lat: geo.lat!, lng: geo.lng!, accuracy: geo.accuracy });
              }}
            >
              <Icon d={ICONS.check} size={16} />
              {canConfirmGps
                ? t("Confirm: I am at the official pin", "कन्फ़र्म: मैं आधिकारिक पिन पर हूँ")
                : t("Get within ~200 m of the pin to confirm", "कन्फ़र्म के लिए पिन के ~200 मी अंदर आएँ")}
            </button>
            {!live && (
              <button className="btn ghost wide" type="button" onClick={geo.request}>
                {t("Turn on GPS first", "पहले GPS चालू करें")}
              </button>
            )}
            {live && prox !== "at_pin" && (
              <button
                className="btn ghost wide"
                type="button"
                disabled={confirmingArrival}
                onClick={() => {
                  const ok = window.confirm(
                    t(
                      "GPS does not show you at the official pin. Confirm only if you are physically there (GPS can fail indoors). Never confirm a chat/WhatsApp location instead.",
                      "GPS आधिकारिक पिन नहीं दिखा रहा। तभी कन्फ़र्म करें जब आप सच में वहाँ हों (अंदर GPS फेल हो सकता है)। चैट/WhatsApp लोकेशन कन्फ़र्म न करें।",
                    ),
                  );
                  if (ok) onConfirmArrival(live ? { lat: geo.lat!, lng: geo.lng!, accuracy: geo.accuracy } : null);
                }}
              >
                {t("Confirm anyway (I am at the pin)", "फिर भी कन्फ़र्म (मैं पिन पर हूँ)")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Feed map: Google Maps around the helper's live position (or Rishikesh), with locked task pins. */
export function MapBoard({ tasks, geo }: { tasks: Task[]; geo: GeoState }) {
  const { lang, t } = useLang();
  const live = geo.status === "live" && geo.lat !== null && geo.lng !== null;
  const center = live ? { lat: geo.lat!, lng: geo.lng! } : { lat: 30.122, lng: 78.316 };
  const origin = live ? { originLat: geo.lat!, originLng: geo.lng! } : undefined;
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
        const km = live ? kmFromPoint(geo.lat!, geo.lng!, task.area) : null;
        return (
          <div key={task.id} className="card between">
            <Link href={`/task/${task.id}`} className="grow">
              <strong style={{ display: "block" }}>{localize(task.title, task.titleHi, lang)}</strong>
              <span className="meta">{areaName(task.area, lang)}{km !== null ? ` · ${km} km` : ""} · {money(task.budget)}</span>
            </Link>
            <a
              className="btn dark small"
              href={lockedDirectionsUrl(task.area, origin)}
              target="_blank"
              rel="noopener noreferrer"
              title={t("Locked to task pin", "काम के पिन पर लॉक")}
            >
              {t("Navigate", "नेविगेट")}
            </a>
          </div>
        );
      })}
    </div>
  );
}

/** Sticky anti-bait rules for helpers on active jobs. */
export function HelperNavRules({ meetLabel, dropLabel }: { meetLabel: string; dropLabel?: string }) {
  const { t } = useLang();
  return (
    <div className="card tint stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <Icon d={ICONS.shield} size={18} />
        <strong>{t("Don’t get fooled — locked meet point", "धोखा न खाएँ — लॉक मिलन बिंदु")}</strong>
      </div>
      <p className="sub">
        {t("Meet only at", "सिर्फ़ यहीं मिलें")}: <strong>{meetLabel}</strong>
        {dropLabel ? <> → <strong>{dropLabel}</strong></> : null}
      </p>
      <ul className="sub" style={{ margin: 0, paddingLeft: 18 }}>
        <li>{t("Ignore new pins from chat, WhatsApp, SMS, or calls.", "चैट/WhatsApp/SMS/कॉल के नए पिन न मानें।")}</li>
        <li>{t("Navigate only with the buttons above (catalog coords).", "नेविगेट सिर्फ़ ऊपर वाले बटन से (कैटलॉग निर्देशांक)।")}</li>
        <li>{t("Confirm arrival on GPS at the official pin before marking done.", "पूरा मार्क करने से पहले आधिकारिक पिन पर GPS पहुँच कन्फ़र्म करें।")}</li>
        <li>{t("If they push you elsewhere, report / block — don’t go.", "अगर कहीं और बुलाएँ तो रिपोर्ट/ब्लॉक — मत जाएँ।")}</li>
      </ul>
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
  const { reportUser, blockUser, unblockUser, iBlocked } = useStore();
  const { t } = useLang();
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const alreadyBlocked = iBlocked(userId);
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
        {alreadyBlocked && (
          <p className="note" role="status">{t("You have blocked this person. Chat and new offers are blocked both ways.", "आपने इस व्यक्ति को ब्लॉक किया है। चैट और नए ऑफ़र दोनों तरफ बंद हैं।")}</p>
        )}
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
        {sent && <p className="ok">{t("Report sent to LocalMate. (Simulated in-app)", "रिपोर्ट LocalMate को भेज दी गई। (सिम्युलेटेड)")}</p>}
        {alreadyBlocked ? (
          <button
            type="button"
            className="btn dark wide"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(t("Unblock this person?", "इस व्यक्ति को अनब्लॉक करें?"))) return;
              setBusy(true);
              try {
                await unblockUser(userId);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Unblock", "अनब्लॉक")}
          </button>
        ) : (
          <button
            type="button"
            className="btn danger wide"
            disabled={busy}
            onClick={async () => {
              const ok = window.confirm(
                t(
                  "Block this person? They cannot message you or apply to your tasks. If you share an active task, it will be flagged for safety review — not auto-completed or paid.",
                  "ब्लॉक करें? वे मैसेज या आपके काम पर अप्लाई नहीं कर सकेंगे। अगर चालू काम है तो सेफ्टी रिव्यू के लिए फ़्लैग होगा — ऑटो-कम्प्लीट/पेमेंट नहीं।",
                ),
              );
              if (!ok) return;
              setBusy(true);
              try {
                await blockUser(userId, taskId);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Block this person", "इस व्यक्ति को ब्लॉक करें")}
          </button>
        )}
        <button type="button" className="btn ghost wide" onClick={onClose}>{t("Close", "बंद करें")}</button>
      </div>
    </div>
  );
}
