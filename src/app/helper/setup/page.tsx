"use client";

import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { CATEGORIES, categoryLabel, isClearedHelper } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RULES = [
  {
    en: "I only do the task the customer posted. I do not add extra stops.",
    hi: "मैं सिर्फ़ वही काम करूँगा जो कस्टमर ने पोस्ट किया है। अतिरिक्त स्टॉप नहीं जोड़ूँगा।",
  },
  {
    en: "Payment stays inside LocalMate. I do not ask for cash on the side, a card number, or personal UPI before the task is finished in the app.",
    hi: "पेमेंट LocalMate के अंदर ही रहेगी। काम ऐप में पूरा होने से पहले साइड में कैश, कार्ड नंबर, या पर्सनल UPI नहीं माँगूँगा।",
  },
  {
    en: "I meet only at the public place named on the task.",
    hi: "मैं सिर्फ़ उसी सार्वजनिक जगह पर मिलूँगा जो काम पर लिखी है।",
  },
  {
    en: "I never ask for a passport, PIN, OTP, or to hold someone's phone.",
    hi: "मैं पासपोर्ट, PIN, OTP, या किसी का फ़ोन पकड़ने को कभी नहीं माँगूँगा।",
  },
  {
    en: "If the request changes or I feel unsafe, I stop and use Report.",
    hi: "अगर रिक्वेस्ट बदले या मुझे असुरक्षित लगे, तो मैं रुकूँगा और रिपोर्ट करूँगा।",
  },
];

export default function HelperSetupPage() {
  const { user, saveWorkerSetup, requestIdentityReview } = useStore();
  const { lang, t } = useLang();
  const router = useRouter();
  const [picked, setPicked] = useState<CategoryId[]>(user?.categories ?? []);
  const [checks, setChecks] = useState<boolean[]>(() => RULES.map(() => Boolean(user?.conductAccepted)));
  const [saved, setSaved] = useState(false);
  const [requested, setRequested] = useState(false);

  if (!user) return <Shell><div /></Shell>;

  const accepted = checks.filter(Boolean).length;
  const ready = accepted === RULES.length && picked.length > 0;
  const cleared = isClearedHelper({ ...user, categories: picked, conductAccepted: accepted === RULES.length });

  const toggleCategory = (id: CategoryId) => {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setSaved(false);
  };

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push("/profile")}>{t("Profile", "प्रोफ़ाइल")}</button>
      <p className="kicker">{t("Worker setup", "वर्कर सेटअप")}</p>
      <h2 className="display">{t("Clearance before any task", "किसी भी काम से पहले क्लीयरेंस")}</h2>
      <p className="sub">
        {t(
          "Customers only see workers who accept these rules, pick real work categories, and pass an ID review by LocalMate.",
          "कस्टमर सिर्फ़ उन्हीं वर्कर को देखते हैं जो ये नियम मानते हैं, असली काम की कैटेगरी चुनते हैं, और LocalMate का ID रिव्यू पास करते हैं।",
        )}
      </p>

      <ol className="steps" style={{ marginTop: 14 }}>
        <li className={picked.length > 0 ? "done" : "now"}><i /><span>{t("Categories", "कैटेगरी")}</span></li>
        <li className={accepted === RULES.length ? "done" : picked.length > 0 ? "now" : ""}><i /><span>{t("Rules", "नियम")}</span></li>
        <li className={user.identityVerified ? "done" : ready ? "now" : ""}><i /><span>{t("ID review", "ID रिव्यू")}</span></li>
      </ol>

      <div className="section"><h3>{t("Work you can take", "जो काम आप ले सकते हैं")}</h3><span className="meta">{picked.length} {t("picked", "चुने")}</span></div>
      <div className="cats">
        {CATEGORIES.map((category) => {
          const on = picked.includes(category.id);
          return (
            <button key={category.id} type="button" className={`cat ${on ? "on" : ""}`} onClick={() => toggleCategory(category.id)} aria-pressed={on}>
              <em>{category.emoji}</em>
              <strong>{categoryLabel(category, lang)}</strong>
            </button>
          );
        })}
      </div>

      <div className="section"><h3>{t("Safety rules", "सेफ्टी नियम")}</h3><span className="meta">{accepted}/{RULES.length}</span></div>
      <div className="stack" style={{ gap: 8 }}>
        {RULES.map((rule, index) => (
          <button
            key={rule.en}
            type="button"
            role="checkbox"
            aria-checked={checks[index]}
            className={`choice ${checks[index] ? "on" : ""}`}
            onClick={() => {
              setChecks((current) => current.map((item, itemIndex) => (itemIndex === index ? !item : item)));
              setSaved(false);
            }}
          >
            <span className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <span aria-hidden="true" style={{ flex: "none", width: 22, height: 22, borderRadius: 7, border: `2px solid ${checks[index] ? "var(--green)" : "var(--line)"}`, background: checks[index] ? "var(--green)" : "#fff", color: "#fff", display: "grid", placeItems: "center", marginTop: 1 }}>
                {checks[index] && <Icon d={ICONS.check} size={14} />}
              </span>
              <span style={{ fontSize: 14.5, lineHeight: 1.45 }}>{t(rule.en, rule.hi)}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        className="btn primary wide"
        style={{ marginTop: 16 }}
        type="button"
        disabled={!ready}
        onClick={async () => {
          if (!ready) return;
          await saveWorkerSetup(picked);
          setSaved(true);
          if (user.identityVerified) router.push("/feed");
        }}
      >
        {t("Save worker setup", "वर्कर सेटअप सेव करें")}
      </button>
      {!ready && (
        <p className="meta" style={{ textAlign: "center", marginTop: 8 }}>{t("Pick at least one category and accept all five rules.", "कम से कम एक कैटेगरी चुनें और पाँचों नियम मानें।")}</p>
      )}

      {!user.identityVerified && (
        <div className="card tint stack" style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 8 }}><Icon d={ICONS.shield} size={18} /><strong>{t("ID review by LocalMate", "LocalMate का ID रिव्यू")}</strong></div>
          <p className="sub">
            {t(
              "You cannot clear your own ID. Request a review — only LocalMate staff can approve it on the server. Do not upload passport or ID numbers here.",
              "आप खुद अपनी ID क्लीयर नहीं कर सकते। रिव्यू का अनुरोध करें — सिर्फ़ LocalMate स्टाफ़ सर्वर पर approve कर सकता है। यहाँ पासपोर्ट/ID नंबर न डालें।",
            )}
          </p>
          {(user.identityReviewStatus === "pending" || requested) ? (
            <span className="badge pending">{t("Review requested · waiting on LocalMate", "रिव्यू अनुरोध · LocalMate का इंतज़ार")}</span>
          ) : (
            <button
              className="btn dark wide"
              type="button"
              onClick={async () => {
                await requestIdentityReview();
                setRequested(true);
              }}
            >
              {t("Request ID review", "ID रिव्यू का अनुरोध")}
            </button>
          )}
          {saved && <p className="ok">{t("Setup saved. You still cannot take tasks until LocalMate clears your ID.", "सेटअप सेव। ID क्लीयर होने तक काम नहीं ले सकते।")}</p>}
        </div>
      )}

      {user.identityVerified && cleared && (
        <p className="ok" style={{ marginTop: 12 }}>{t("You are cleared for the categories you picked.", "आप चुनी हुई कैटेगरी के लिए क्लीयर हैं।")}</p>
      )}
    </Shell>
  );
}
