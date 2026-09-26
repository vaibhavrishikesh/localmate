"use client";

import { Shell, useLang } from "@/components/Shell";
import { AREAS, CATEGORIES, WHENS, categoryLabel, isCategory, money, splitFee } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import type { CategoryId, PriceMode } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="row" style={{ gap: 10, marginTop: 6 }}>
      <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 8, background: "var(--green)", color: "#fff", fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{n}</span>
      <h3>{title}</h3>
    </div>
  );
}

function NewTaskForm() {
  const { user, createTask } = useStore();
  const { lang, t } = useLang();
  const router = useRouter();
  const search = useSearchParams();
  const initial = search.get("category");
  const [category, setCategory] = useState<CategoryId>(initial && isCategory(initial) ? initial : "luggage");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [area, setArea] = useState("tapovan");
  const [toArea, setToArea] = useState("laxman");
  const [whenId, setWhenId] = useState("today-5");
  const [customWhen, setCustomWhen] = useState("");
  const [mode, setMode] = useState<PriceMode>("fixed");
  const [budget, setBudget] = useState(500);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  const when = WHENS.find((item) => item.id === whenId) ?? WHENS[0];
  const parts = splitFee(budget);
  const areaLabel = (id: string) => AREAS.find((item) => item.id === id)?.[lang === "hi" ? "hi" : "en"] ?? id;
  const canPost = user?.role === "customer" && title.trim().length > 2 && budget >= 50;

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push("/home")}>{t("Home", "होम")}</button>
      <p className="kicker">{t("New task", "नया काम")}</p>
      <h2 className="display">{t("Create a task", "काम बनाएँ")}</h2>
      <p className="sub">{t("You set the price. Cleared locals accept it, or offer their own.", "कीमत आप रखें। क्लीयर लोकल स्वीकार करें, या अपनी कीमत बताएँ।")}</p>

      {user?.role === "helper" && (
        <p className="note" style={{ marginTop: 12 }}>
          {t("Switch to the customer view to post a task.", "काम पोस्ट करने के लिए कस्टमर व्यू खोलें।")}
        </p>
      )}

      <form
        className="stack"
        style={{ marginTop: 14, gap: 16 }}
        onSubmit={async (event) => {
          event.preventDefault();
          setPosting(true);
          const whenLabel = whenId === "custom" ? customWhen.trim() : when.en;
          const whenLabelHi = whenId === "custom" ? customWhen.trim() : when.hi;
          const result = await createTask({
            category, title, details, area,
            toArea: toArea || undefined,
            whenId, whenLabel, whenLabelHi,
            priceMode: mode, budget,
          });
          if (!result.ok) {
            setPosting(false);
            setError(
              result.error === "banned"
                ? t("This task isn't allowed. LocalMate blocks unsafe or prohibited work.", "यह काम अनुमति में नहीं है। LocalMate असुरक्षित काम ब्लॉक करता है।")
                : t("Add a title, details, and a price of at least ₹50.", "टाइटल, डिटेल, और कम से कम ₹50 कीमत डालें।"),
            );
            return;
          }
          router.push(`/task/${result.id}`);
        }}
      >
        <div className="stack">
          <Step n={1} title={t("Category", "कैटेगरी")} />
          <div className="chips">
            {CATEGORIES.map((item) => (
              <button key={item.id} className={`chip ${category === item.id ? "on" : ""}`} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>
                {item.emoji} {categoryLabel(item, lang)}
              </button>
            ))}
          </div>
        </div>

        <div className="stack">
          <Step n={2} title={t("What needs doing", "क्या करना है")} />
          <label className="field">
            <span>{t("Task", "काम")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("Need someone to pick up my luggage", "किसी को मेरा सामान उठाना है")} maxLength={80} />
          </label>
          <label className="field">
            <span>{t("Details", "विवरण")}</span>
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder={t("2 bags, need help taking them to my hostel", "2 बैग हैं, इन्हें मेरे हॉस्टल तक ले जाने में मदद चाहिए")} />
            <span className="help">{t("Do not include passport, card, or PIN details.", "पासपोर्ट, कार्ड, या PIN की जानकारी न लिखें।")}</span>
          </label>
          <button
            className="top-link"
            type="button"
            style={{ margin: 0 }}
            onClick={() => {
              setCategory("luggage");
              setTitle("Need someone to pick up my luggage");
              setDetails("2 bags, need help taking them to my hostel");
              setArea("tapovan");
              setToArea("laxman");
              setWhenId("today-5");
              setMode("fixed");
              setBudget(500);
            }}
          >
            {t("Fill the luggage sample", "सामान वाला उदाहरण भरें")}
          </button>
        </div>

        <div className="stack">
          <Step n={3} title={t("Where and when", "कहाँ और कब")} />
          <div>
            <span className="label">{t("Meeting point", "मिलने की जगह")}</span>
            <div className="wrap">
              {AREAS.map((item) => (
                <button key={item.id} type="button" className={`chip ${area === item.id ? "on" : ""}`} onClick={() => setArea(item.id)} aria-pressed={area === item.id}>
                  📍 {areaLabel(item.id)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">{t("Drop-off, if any", "छोड़ना हो तो कहाँ")}</span>
            <div className="wrap">
              <button type="button" className={`chip ${toArea === "" ? "on" : ""}`} onClick={() => setToArea("")}>{t("No drop-off", "कोई ड्रॉप नहीं")}</button>
              {AREAS.map((item) => (
                <button key={item.id} type="button" className={`chip ${toArea === item.id ? "on" : ""}`} onClick={() => setToArea(item.id)}>
                  {areaLabel(item.id)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">{t("When", "कब")}</span>
            <div className="wrap">
              {WHENS.map((item) => (
                <button key={item.id} type="button" className={`chip ${whenId === item.id ? "on" : ""}`} onClick={() => setWhenId(item.id)}>
                  {t(item.en, item.hi)}
                </button>
              ))}
            </div>
            {whenId === "custom" && (
              <label className="field" style={{ marginTop: 10 }}>
                <span>{t("Date and time", "तारीख और समय")}</span>
                <input value={customWhen} onChange={(event) => setCustomWhen(event.target.value)} placeholder={t("e.g. Sunday 9 am", "जैसे रविवार 9 बजे")} />
              </label>
            )}
          </div>
        </div>

        <div className="stack">
          <Step n={4} title={t("Price", "कीमत")} />
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className={`choice ${mode === "fixed" ? "on" : ""}`} onClick={() => setMode("fixed")}>
              <strong>{t("Fixed price", "फिक्स्ड कीमत")}</strong>
              <span className="sub">{t("Helpers accept exactly this amount.", "हेल्पर ठीक यही रकम स्वीकार करते हैं।")}</span>
            </button>
            <button type="button" className={`choice ${mode === "negotiable" ? "on" : ""}`} onClick={() => setMode("negotiable")}>
              <strong>{t("Negotiable", "बातचीत से")}</strong>
              <span className="sub">{t("Helpers can offer a different price. You choose.", "हेल्पर दूसरी कीमत बता सकते हैं। फैसला आपका।")}</span>
            </button>
          </div>
          <label className="field">
            <span>{mode === "fixed" ? t("You pay", "आप देंगे") : t("Your budget", "आपका बजट")}</span>
            <div className="money-input">
              <input type="number" min={50} step={10} value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
            </div>
          </label>
          <div className="wrap">
            {[200, 300, 500, 700, 1000].map((amount) => (
              <button key={amount} type="button" className={`chip ${budget === amount ? "on" : ""}`} onClick={() => setBudget(amount)}>
                {money(amount)}
              </button>
            ))}
          </div>
          <div className="card flat split">
            <div><span>{t("You pay", "आप देंगे")}</span><strong>{money(parts.total)}</strong></div>
            <div><span>{t("LocalMate commission 10%", "LocalMate कमीशन 10%")}</span><span>{money(parts.fee)}</span></div>
            <div className="total"><span>{t("Helper receives", "हेल्पर को मिलेंगे")}</span><strong style={{ color: "var(--green)" }}>{money(parts.helper)}</strong></div>
          </div>
        </div>

        {error && <p className="note" role="alert">{error}</p>}
        <button className="btn primary wide" type="submit" disabled={!canPost || posting}>
          {posting ? t("Posting…", "पोस्ट हो रहा है…") : t("Post task", "काम पोस्ट करें")}
        </button>
        {!canPost && user?.role === "customer" && (
          <p className="meta" style={{ textAlign: "center" }}>{t("Add a title and a price of at least ₹50 to post.", "पोस्ट करने के लिए टाइटल और कम से कम ₹50 कीमत डालें।")}</p>
        )}
      </form>
    </Shell>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense fallback={<Shell><div className="skeleton" style={{ height: 120 }} /></Shell>}>
      <NewTaskForm />
    </Suspense>
  );
}
