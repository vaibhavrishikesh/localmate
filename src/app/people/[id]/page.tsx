"use client";

import { Avatar, SafetySheet, Stats } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { areaName, CATEGORIES, categoryLabel, isClearedHelper, workerCategories } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, user } = useStore();
  const { lang, t } = useLang();
  const [safety, setSafety] = useState(false);
  const person = state.users.find((item) => item.id === params.id);

  if (!person) return <Shell><p className="empty">{t("Person not found.", "व्यक्ति नहीं मिला।")}</p></Shell>;

  const bio = lang === "hi" ? person.bioHi : person.bioEn;
  const isHelper = person.role === "helper";
  const cleared = isHelper && isClearedHelper(person);
  const categories = workerCategories(person)
    .map((id) => CATEGORIES.find((item) => item.id === id))
    .filter((item) => item !== undefined);

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.back()}>{t("Back", "वापस")}</button>
      <div className="row" style={{ alignItems: "center" }}>
        <Avatar name={person.name} size={64} />
        <div className="grow">
          <h2 className="display" style={{ fontSize: 26 }}>{person.name}</h2>
          <p className="meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d={ICONS.pin} size={13} /> {areaName(person.area, lang)}, {person.city} · {t("since", "से")} {person.memberSince}
          </p>
        </div>
      </div>
      {bio && <p className="sub" style={{ marginTop: 10 }}>{bio}</p>}

      {isHelper && <div style={{ marginTop: 14 }}><Stats person={person} /></div>}

      <div className="section"><h3>{t("Trust & safety", "भरोसा और सुरक्षा")}</h3></div>
      <div className="card stack" style={{ gap: 8 }}>
        {isHelper && cleared && (
          <>
            <span className="badge">{t("ID reviewed by LocalMate", "ID LocalMate ने जाँची")}</span>
            <span className="badge">{t("Safety rules accepted", "सेफ्टी नियम माने")}</span>
            <span className="badge">{t("Meets in public · pay stays in the app", "सार्वजनिक जगह · पेमेंट ऐप में")}</span>
            {person.tasksCompleted < 5 && <span className="badge pending">{t("New worker · one task at a time, up to ₹1,000", "नया वर्कर · एक बार में एक काम, ₹1,000 तक")}</span>}
          </>
        )}
        {isHelper && !cleared && (
          <span className="badge off">{t("Not cleared to take tasks yet", "अभी काम लेने के लिए क्लीयर नहीं")}</span>
        )}
        {!isHelper && (
          <span className={`badge ${person.phoneVerified ? "" : "off"}`}>{person.phoneVerified ? t("Phone verified", "फ़ोन वेरिफ़ाइड") : t("Phone not verified", "फ़ोन वेरिफ़ाइड नहीं")}</span>
        )}
        {categories.length > 0 && (
          <div className="wrap" style={{ marginTop: 4 }}>
            {categories.map((item) => <span key={item.id} className="chip" style={{ pointerEvents: "none" }}>{item.emoji} {categoryLabel(item, lang)}</span>)}
          </div>
        )}
        <p className="meta" style={{ marginTop: 4 }}>{t("Preview build: sample statuses, not a real identity check.", "प्रीव्यू: सैंपल स्टेटस, असली पहचान जाँच नहीं।")}</p>
      </div>

      {person.reviews.length > 0 && (
        <>
          <div className="section"><h3>{t("Reviews", "रिव्यू")}</h3><span className="meta">{person.reviews.length}</span></div>
          <div className="stack">
            {person.reviews.map((review) => (
              <article key={review.id} className="card">
                <div className="between">
                  <strong>{review.by}</strong>
                  <span className="stars" aria-label={`${review.stars} stars`}>{"★".repeat(review.stars)}</span>
                </div>
                <p className="sub" style={{ marginTop: 4 }}>“{review.text}”</p>
              </article>
            ))}
          </div>
        </>
      )}

      {user && user.id !== person.id && (
        <button className="btn danger wide" style={{ marginTop: 20 }} type="button" onClick={() => setSafety(true)}>
          <Icon d={ICONS.shield} size={16} /> {t("Report or block", "रिपोर्ट या ब्लॉक")}
        </button>
      )}
      {safety && <SafetySheet userId={person.id} onClose={() => setSafety(false)} />}
    </Shell>
  );
}
