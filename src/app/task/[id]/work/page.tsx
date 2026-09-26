"use client";

import { Avatar, LiveMap, SafetySheet, StatusPill, StatusSteps } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { areaName, localize } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { canTransition } from "@/lib/workflow";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function WorkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    user,
    state,
    startTask,
    shareLocation,
    completeTask,
    confirmCompletion,
    reportTaskProblem,
    blocked,
  } = useStore();
  const { lang, t } = useLang();
  const [safety, setSafety] = useState(false);
  const [busy, setBusy] = useState(false);
  const task = state.tasks.find((item) => item.id === params.id);
  const otherId = task && user ? (user.id === task.customerId ? task.helperId : task.customerId) : undefined;
  const other = state.users.find((item) => item.id === otherId);
  const isBlockedPair = Boolean(otherId && blocked(otherId));

  if (!task || !user) return <Shell><p className="empty">{t("Task not found.", "काम नहीं मिला।")}</p></Shell>;

  const involved = user.id === task.customerId || user.id === task.helperId;
  const isHelper = user.id === task.helperId;
  const isCustomer = user.id === task.customerId;
  const chatRestricted = task.status === "flagged" || task.status === "cancelled" || isBlockedPair;

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push(`/task/${task.id}`)}>{t("Task", "काम")}</button>
      <div className="between">
        <p className="kicker">{t("Active task", "चालू काम")}</p>
        <StatusPill status={task.status} />
      </div>
      <h2 className="display">{localize(task.title, task.titleHi, lang)}</h2>
      {task.status !== "cancelled" && task.status !== "flagged" && <StatusSteps status={task.status} />}

      {(task.status === "flagged" || isBlockedPair) && (
        <p className="note" role="alert" style={{ marginTop: 12 }}>
          {t(
            "Safety hold: chat and new actions are restricted. This task was not auto-completed or paid. Report below or contact LocalMate support.",
            "सेफ्टी होल्ड: चैट और नए ऐक्शन बंद। काम ऑटो-कम्प्लीट/पेमेंट नहीं हुआ। नीचे रिपोर्ट करें या LocalMate सपोर्ट से संपर्क करें।",
          )}
          {task.flagReason ? ` · ${task.flagReason}` : ""}
        </p>
      )}

      {task.status === "awaiting_customer_confirmation" && (
        <p className="info" style={{ marginTop: 12 }}>
          {t(
            "Helper marked this done. Customer must confirm before payment. (Simulated in-app notification sent.)",
            "हेल्पर ने पूरा मार्क किया। पेमेंट से पहले कस्टमर कन्फ़र्म करे। (सिम्युलेटेड अलर्ट भेजा गया।)",
          )}
          {task.helperMarkedDoneAt && (
            <span className="meta" style={{ display: "block", marginTop: 4 }}>
              {t("Marked", "मार्क")}: {new Date(task.helperMarkedDoneAt).toLocaleString()}
            </span>
          )}
        </p>
      )}

      <div className="section" style={{ marginTop: 16 }}>
        <h3>{t("Meeting point", "मिलने की जगह")}</h3>
        <span className="meta">{areaName(task.area, lang)}{task.toArea ? ` → ${areaName(task.toArea, lang)}` : ""}</span>
      </div>
      <LiveMap areaId={task.area} />

      {other && (
        <div className="card row" style={{ marginTop: 12 }}>
          <Avatar name={other.name} />
          <div className="grow">
            <Link href={`/people/${other.id}`}><strong>{other.name}</strong></Link>
            <p className="meta">{isHelper ? t("Customer", "कस्टमर") : t("Helper", "हेल्पर")}</p>
            {isBlockedPair && <span className="badge pending">{t("Blocked", "ब्लॉक")}</span>}
          </div>
          {!chatRestricted && (
            <>
              <a className="btn ghost small" href={`tel:${other.phone}`} aria-label={t("Call", "कॉल")}>📞 {t("Call", "कॉल")}</a>
              <Link className="btn dark small" href={`/task/${task.id}/chat`}><Icon d={ICONS.chat} size={15} /> {t("Chat", "चैट")}</Link>
            </>
          )}
        </div>
      )}

      <div className="card stack" style={{ marginTop: 12 }}>
        <div className="between">
          <strong>{t("Live location", "लाइव लोकेशन")}</strong>
          {task.locationShared ? <span className="pill live">{t("Shared", "शेयर की")}</span> : <span className="pill">{t("Hidden", "छिपी")}</span>}
        </div>
        <p className="meta">
          {task.locationShared
            ? t("Your live position is visible to the other person inside this task only, and stops when the task ends.", "आपकी लाइव लोकेशन सिर्फ़ इस काम में दूसरे व्यक्ति को दिखती है, और काम खत्म होने पर बंद हो जाती है।")
            : t("Exact position stays hidden until the task is active and you choose to share it.", "सटीक लोकेशन तब तक छिपी है जब तक काम चालू होकर आप शेयर न करें।")}
        </p>
        {task.status === "active" && !task.locationShared && !chatRestricted && (
          <button className="btn dark wide" type="button" onClick={() => void shareLocation(task.id)}>
            <Icon d={ICONS.pin} size={16} /> {t("Share my live location", "मेरी लाइव लोकेशन शेयर करें")}
          </button>
        )}
      </div>

      {isCustomer && task.status === "active" && (
        <div className="card tint stack" style={{ marginTop: 12, gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon d={ICONS.shield} size={18} />
            <strong>{t("Stay safe", "सुरक्षित रहें")}</strong>
          </div>
          <p className="sub">{t("Meet only at the place written on this task.", "सिर्फ़ उसी जगह मिलें जो इस काम पर लिखी है।")}</p>
          <p className="sub">{t("Pay only inside LocalMate.", "पेमेंट सिर्फ़ LocalMate के अंदर करें।")}</p>
        </div>
      )}

      {involved && !chatRestricted && (
        <div className="stack" style={{ marginTop: 16 }}>
          {task.status === "matched" && isHelper && (
            <button className="btn primary wide" type="button" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await startTask(task.id); } finally { setBusy(false); }
            }}>{t("Start task", "काम शुरू करें")}</button>
          )}
          {task.status === "matched" && isCustomer && (
            <p className="info">{t("Waiting for the helper to start. You will get an alert.", "हेल्पर के शुरू करने का इंतज़ार। आपको अलर्ट मिलेगा।")}</p>
          )}
          {task.status === "active" && isHelper && canTransition(task, "helper_mark_done", user.id, user.role).ok && (
            <button
              className="btn primary wide"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await completeTask(task.id);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Icon d={ICONS.check} size={16} /> {t("Mark done — wait for customer", "पूरा मार्क — कस्टमर का इंतज़ार")}
            </button>
          )}
          {task.status === "active" && isCustomer && (
            <p className="info">{t("Only the helper can mark work done. You will confirm next.", "सिर्फ़ हेल्पर काम पूरा मार्क कर सकता है। फिर आप कन्फ़र्म करेंगे।")}</p>
          )}
          {task.status === "awaiting_customer_confirmation" && isCustomer && (
            <>
              <button
                className="btn primary wide"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await confirmCompletion(task.id);
                    router.push(`/task/${task.id}/pay`);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Icon d={ICONS.check} size={16} /> {t("Confirm completion → pay", "पूरा कन्फ़र्म → पेमेंट")}
              </button>
              <button
                className="btn danger wide"
                type="button"
                disabled={busy}
                onClick={async () => {
                  const reason = window.prompt(
                    t("Describe the problem (required):", "समस्या लिखें (ज़रूरी):"),
                    "",
                  );
                  if (!reason?.trim()) return;
                  setBusy(true);
                  try {
                    await reportTaskProblem(task.id, reason.trim());
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("Report a problem", "समस्या रिपोर्ट करें")}
              </button>
            </>
          )}
          {task.status === "awaiting_customer_confirmation" && isHelper && (
            <p className="info">{t("Waiting for the customer to confirm. Payment opens after they confirm.", "कस्टमर के कन्फ़र्म का इंतज़ार। उनके कन्फ़र्म के बाद पेमेंट खुलेगा।")}</p>
          )}
          {(task.status === "pay" || task.status === "review" || task.status === "completed") && (
            <Link className="btn gold wide" href={task.status === "pay" ? `/task/${task.id}/pay` : `/task/${task.id}/review`}>
              {task.status === "pay" ? t("Go to payment", "पेमेंट पर जाएँ") : t("Go to review", "रिव्यू पर जाएँ")}
            </Link>
          )}
          {other && <button className="btn danger wide" type="button" onClick={() => setSafety(true)}>{t("Emergency / report / block", "इमरजेंसी / रिपोर्ट / ब्लॉक")}</button>}
        </div>
      )}

      {involved && chatRestricted && other && (
        <div className="stack" style={{ marginTop: 16 }}>
          <button className="btn danger wide" type="button" onClick={() => setSafety(true)}>{t("Report or manage block", "रिपोर्ट या ब्लॉक मैनेज करें")}</button>
          <a className="btn ghost wide" href="https://wa.me/919711964456?text=Hi%20Kamal%2C%20LocalMate%20support">{t("Contact LocalMate support", "LocalMate सपोर्ट से संपर्क")}</a>
        </div>
      )}
      {safety && other && <SafetySheet userId={other.id} taskId={task.id} onClose={() => setSafety(false)} />}
    </Shell>
  );
}
