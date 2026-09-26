"use client";

import { Avatar, Stats } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { CATEGORIES, categoryLabel, isClearedHelper, workerCategories } from "@/lib/catalog";
import { LANGS } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, state, setLanguage, signOut, resetDemo, signIn } = useStore();
  const { lang, t } = useLang();
  const router = useRouter();
  if (!user) return <Shell><div /></Shell>;

  const posted = state.tasks.filter((task) => task.customerId === user.id).length;
  const bio = lang === "hi" ? user.bioHi : user.bioEn;
  const isHelper = user.role === "helper";
  const cleared = isClearedHelper(user);
  const categories = workerCategories(user)
    .map((id) => CATEGORIES.find((item) => item.id === id))
    .filter((item) => item !== undefined);

  return (
    <Shell>
      <div className="row" style={{ alignItems: "center" }}>
        <Avatar name={user.name} size={64} />
        <div className="grow">
          <h2 className="display" style={{ fontSize: 26 }}>{user.name}</h2>
          <p className="meta">{isHelper ? t("Helper", "हेल्पर") : t("Customer", "कस्टमर")} · {user.city}</p>
        </div>
      </div>
      {bio && <p className="sub" style={{ marginTop: 10 }}>{bio}</p>}

      <div style={{ marginTop: 14 }}>
        {isHelper ? (
          <Stats person={user} />
        ) : (
          <div className="stats">
            <div className="stat"><strong>{posted}</strong><span>{t("tasks posted", "काम पोस्ट")}</span></div>
            <div className="stat"><strong>{state.tasks.filter((task) => task.customerId === user.id && task.status === "completed").length}</strong><span>{t("completed", "पूरे")}</span></div>
            <div className="stat"><strong>{user.memberSince}</strong><span>{t("member since", "सदस्य")}</span></div>
          </div>
        )}
      </div>

      <div className="section"><h3>{t("Verification", "वेरिफ़िकेशन")}</h3></div>
      <div className="card stack" style={{ gap: 8 }}>
        <span className={`badge ${user.phoneVerified ? "" : "off"}`}>{user.phoneVerified ? t("Phone verified", "फ़ोन वेरिफ़ाइड") : t("Phone not verified", "फ़ोन वेरिफ़ाइड नहीं")}</span>
        {isHelper && (
          <>
            <span className={`badge ${user.conductAccepted ? "" : "off"}`}>{user.conductAccepted ? t("Safety rules accepted", "सेफ्टी नियम माने") : t("Safety rules not accepted", "सेफ्टी नियम नहीं माने")}</span>
            <span className={`badge ${user.identityVerified ? "" : "pending"}`}>{user.identityVerified ? t("ID reviewed by LocalMate", "ID LocalMate ने जाँची") : user.identityReviewStatus === "pending" ? t("ID review requested", "ID रिव्यू अनुरोधित") : t("ID review pending", "ID रिव्यू बाकी")}</span>
            <span className={`badge ${cleared ? "" : "off"}`}>{cleared ? t("Cleared to take tasks", "काम लेने के लिए क्लीयर") : t("Not cleared to take tasks", "काम लेने के लिए क्लीयर नहीं")}</span>
            {categories.length > 0 && (
              <div className="wrap" style={{ marginTop: 4 }}>
                {categories.map((item) => <span key={item.id} className="chip" style={{ pointerEvents: "none" }}>{item.emoji} {categoryLabel(item, lang)}</span>)}
              </div>
            )}
          </>
        )}
        <p className="meta" style={{ marginTop: 4 }}>
          {t("Preview build: statuses are sample data, not a real identity check.", "प्रीव्यू: ये स्टेटस सैंपल डेटा हैं, असली पहचान जाँच नहीं।")}
        </p>
      </div>

      <div className="section"><h3>{t("Settings", "सेटिंग")}</h3></div>
      <div className="card stack">
        <label className="field">
          <span>{t("App language", "ऐप की भाषा")}</span>
          <select value={lang} onChange={(event) => setLanguage(event.target.value as Lang)}>
            {LANGS.map((item) => (
              <option key={item.id} value={item.id}>{item.native}</option>
            ))}
          </select>
        </label>
        {isHelper && (
          <Link className="btn dark wide" href="/helper/setup">
            <Icon d={ICONS.shield} size={16} /> {cleared ? t("Work categories & rules", "काम की कैटेगरी और नियम") : t("Finish worker setup", "वर्कर सेटअप पूरा करें")}
          </Link>
        )}
        <Link className="btn ghost wide" href="/tasks"><Icon d={ICONS.list} size={16} /> {isHelper ? t("My jobs", "मेरे काम") : t("My tasks", "मेरे काम")}</Link>
      </div>

      <div className="section"><h3>{t("Demo", "डेमो")}</h3></div>
      <div className="card stack">
        {(user.id === "maya" || user.id === "rahul") && (
          <button
            className="btn gold wide"
            type="button"
            onClick={async () => {
              const next = user.id === "maya" ? "rahul" : "maya";
              await signIn(next);
              router.push(next === "rahul" ? "/feed" : "/home");
            }}
          >
            {user.id === "maya" ? t("Switch to Rahul (helper)", "Rahul (हेल्पर) पर जाएँ") : t("Switch to Maya (customer)", "Maya (कस्टमर) पर जाएँ")}
          </button>
        )}
        <button className="btn ghost wide" type="button" onClick={() => void resetDemo()}>{t("Reset demo data", "डेमो डेटा रीसेट करें")}</button>
        <button className="btn danger wide" type="button" onClick={async () => { await signOut(); router.push("/"); }}>{t("Log out", "लॉग आउट")}</button>
      </div>

      {user.reviews.length > 0 && (
        <>
          <div className="section"><h3>{t("Reviews", "रिव्यू")}</h3><span className="meta">{user.reviews.length}</span></div>
          <div className="stack">
            {user.reviews.map((review) => (
              <article key={review.id} className="card">
                <div className="between">
                  <strong>{review.by}</strong>
                  <span className="stars" aria-label={`${review.stars} stars`}>{"★".repeat(review.stars)}</span>
                </div>
                <p className="sub" style={{ marginTop: 4 }}>{review.text}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
