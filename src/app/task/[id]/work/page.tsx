"use client";

import { Avatar, LiveMap, SafetySheet, StatusPill, StatusSteps } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { areaName, localize } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function WorkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, state, startTask, shareLocation, completeTask } = useStore();
  const { lang, t } = useLang();
  const [safety, setSafety] = useState(false);
  const task = state.tasks.find((item) => item.id === params.id);
  const otherId = task && user ? (user.id === task.customerId ? task.helperId : task.customerId) : undefined;
  const other = state.users.find((item) => item.id === otherId);

  if (!task || !user) return <Shell><p className="empty">{t("Task not found.", "काम नहीं मिला।")}</p></Shell>;

  const involved = user.id === task.customerId || user.id === task.helperId;
  const isHelper = user.id === task.helperId;

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push(`/task/${task.id}`)}>{t("Task", "काम")}</button>
      <div className="between">
        <p className="kicker">{t("Active task", "चालू काम")}</p>
        <StatusPill status={task.status} />
      </div>
      <h2 className="display">{localize(task.title, task.titleHi, lang)}</h2>
      <StatusSteps status={task.status} />

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
          </div>
          <a className="btn ghost small" href={`tel:${other.phone}`} aria-label={t("Call", "कॉल")}>📞 {t("Call", "कॉल")}</a>
          <Link className="btn dark small" href={`/task/${task.id}/chat`}><Icon d={ICONS.chat} size={15} /> {t("Chat", "चैट")}</Link>
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
        {task.status === "active" && !task.locationShared && (
          <button className="btn dark wide" type="button" onClick={() => void shareLocation(task.id)}>
            <Icon d={ICONS.pin} size={16} /> {t("Share my live location", "मेरी लाइव लोकेशन शेयर करें")}
          </button>
        )}
      </div>

      {user.id === task.customerId && (
        <div className="card tint stack" style={{ marginTop: 12, gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon d={ICONS.shield} size={18} />
            <strong>{t("Stay safe", "सुरक्षित रहें")}</strong>
          </div>
          <p className="sub">{t("Meet only at the place written on this task.", "सिर्फ़ उसी जगह मिलें जो इस काम पर लिखी है।")}</p>
          <p className="sub">{t("Pay only inside LocalMate.", "पेमेंट सिर्फ़ LocalMate के अंदर करें।")}</p>
          <p className="sub">{t("Do not hand over a passport, PIN, card, or your phone.", "पासपोर्ट, PIN, कार्ड, या अपना फ़ोन न दें।")}</p>
          <p className="sub">{t("If the plan changes, use Report.", "अगर प्लान बदले, तो रिपोर्ट करें।")}</p>
        </div>
      )}

      {involved && (
        <div className="stack" style={{ marginTop: 16 }}>
          {task.status === "matched" && isHelper && (
            <button className="btn primary wide" type="button" onClick={() => void startTask(task.id)}>{t("Start task", "काम शुरू करें")}</button>
          )}
          {task.status === "matched" && !isHelper && (
            <p className="info">{t("Waiting for the helper to start. You will get an alert.", "हेल्पर के शुरू करने का इंतज़ार। आपको अलर्ट मिलेगा।")}</p>
          )}
          {task.status === "active" && (
            <button className="btn primary wide" type="button" onClick={async () => { await completeTask(task.id); router.push(`/task/${task.id}/pay`); }}>
              <Icon d={ICONS.check} size={16} /> {t("Mark done", "पूरा हुआ")}
            </button>
          )}
          {(task.status === "pay" || task.status === "review" || task.status === "completed") && (
            <Link className="btn gold wide" href={task.status === "pay" ? `/task/${task.id}/pay` : `/task/${task.id}/review`}>
              {task.status === "pay" ? t("Go to payment", "पेमेंट पर जाएँ") : t("Go to review", "रिव्यू पर जाएँ")}
            </Link>
          )}
          {other && <button className="btn danger wide" type="button" onClick={() => setSafety(true)}>{t("Emergency / report", "इमरजेंसी / रिपोर्ट")}</button>}
        </div>
      )}
      {safety && other && <SafetySheet userId={other.id} taskId={task.id} onClose={() => setSafety(false)} />}
    </Shell>
  );
}
