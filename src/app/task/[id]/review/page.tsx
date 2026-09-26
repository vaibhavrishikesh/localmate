"use client";

import { Avatar, StatusSteps, TrustLine } from "@/components/Bits";
import { Shell, useLang } from "@/components/Shell";
import { money } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, state, reviewTask } = useStore();
  const { t } = useLang();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const task = state.tasks.find((item) => item.id === params.id);
  const helper = state.users.find((item) => item.id === task?.helperId);

  if (!task || !user) return <Shell><p className="empty">{t("Task not found.", "काम नहीं मिला।")}</p></Shell>;

  const words = [
    "",
    t("Poor", "खराब"),
    t("Okay", "ठीक"),
    t("Good", "अच्छा"),
    t("Great", "बहुत अच्छा"),
    t("Excellent", "शानदार"),
  ];

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push("/tasks")}>{t("My tasks", "मेरे काम")}</button>
      <p className="kicker">{t("Rating & review", "रेटिंग और रिव्यू")}</p>
      <h2 className="display">{t("How did it go?", "कैसा रहा?")}</h2>
      <StatusSteps status={task.status} />

      {helper && (
        <div className="card row" style={{ marginTop: 16 }}>
          <Avatar name={helper.name} size={48} />
          <div className="grow">
            <strong>{helper.name}</strong>
            <TrustLine person={helper} />
          </div>
          <span className="price" style={{ fontSize: 20 }}>{money(task.agreedAmount ?? task.budget)}</span>
        </div>
      )}

      {task.status === "completed" && (
        <div className="empty" style={{ marginTop: 16 }}>
          <span className="glyph" aria-hidden="true">🎉</span>
          <strong>{t("Review saved. This task is done.", "रिव्यू सेव हो गया। काम पूरा हुआ।")}</strong>
          <Link className="btn primary" href="/home">{t("Back home", "होम पर जाएँ")}</Link>
        </div>
      )}

      {user.id === task.customerId && task.status === "review" && (
        <form
          className="stack"
          style={{ marginTop: 16 }}
          onSubmit={async (event) => {
            event.preventDefault();
            await reviewTask(task.id, stars, text);
            router.push("/tasks");
          }}
        >
          <div className="card stack" style={{ alignItems: "center" }}>
            <div className="row" role="radiogroup" aria-label={t("Stars", "स्टार")}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={value === stars}
                  aria-label={`${value}`}
                  className={`star-btn ${value <= stars ? "on" : ""}`}
                  onClick={() => setStars(value)}
                >
                  ★
                </button>
              ))}
            </div>
            <strong style={{ color: "var(--amber-deep)" }}>{words[stars]}</strong>
          </div>
          <label className="field">
            <span>{t("A few words", "कुछ शब्द")}</span>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t("Very helpful and arrived on time.", "बहुत मददगार थे और समय पर आए।")} />
            <span className="help">{t("Confirming releases the held payment to the helper. Amount stays locked.", "कन्फ़र्म करने पर होल्ड पेमेंट हेल्पर को रिलीज़ होती है। राशि लॉक रहती है।")}</span>
          </label>
          <button className="btn primary wide" type="submit" disabled={text.trim().length < 3}>
            {t("Confirm job & release pay", "काम कन्फ़र्म · पेमेंट रिलीज़")}
          </button>
        </form>
      )}
      {user.id !== task.customerId && task.status === "review" && (
        <p className="info" style={{ marginTop: 16 }}>{t("Payment is in hold. You are paid when the customer confirms.", "पेमेंट होल्ड में है। कस्टमर कन्फ़र्म करे तब आपको मिलेगा।")}</p>
      )}
      {task.status !== "review" && task.status !== "completed" && (
        <p className="info" style={{ marginTop: 16 }}>{t("Review opens after payment.", "पेमेंट के बाद रिव्यू खुलेगा।")}</p>
      )}
    </Shell>
  );
}
