"use client";

import { TopBar, useLang } from "@/components/Shell";
import { isClearedHelper } from "@/lib/catalog";
import { LANGS, textDir } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WelcomePage() {
  const { ready, user, signIn, signUp, setLanguage } = useStore();
  const { lang, t } = useLang();
  const router = useRouter();
  const [step, setStep] = useState<"home" | "form" | "code">("home");
  const [role, setRole] = useState<"customer" | "helper">("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(user.role === "helper" ? (isClearedHelper(user) ? "/feed" : "/helper/setup") : "/home");
  }, [ready, user, router]);

  const enter = async (id: string, next: "customer" | "helper") => {
    await signIn(id);
    router.push(next === "helper" ? "/feed" : "/home");
  };

  return (
    <div className="stage">
      <div className="phone" dir={textDir(lang)}>
        <TopBar tall tagline={t("Need something done? Find a trusted local.", "कोई काम करवाना है? भरोसेमंद लोकल ढूँढें।")} />
        <div className="screen">
          <div className="between">
            <p className="kicker">{t("Rishikesh · launch city", "ऋषिकेश · पहला शहर")}</p>
            <label className="row" style={{ gap: 6 }}>
              <span className="meta">{t("Language", "भाषा")}</span>
              <select
                aria-label={t("Language", "भाषा")}
                value={lang}
                onChange={(event) => setLanguage(event.target.value as Lang)}
                style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "6px 8px", background: "#fff", fontSize: 13 }}
              >
                {LANGS.map((item) => (
                  <option key={item.id} value={item.id}>{item.native}</option>
                ))}
              </select>
            </label>
          </div>

          {step === "home" && (
            <div className="stack" style={{ marginTop: 14 }}>
              <h2 className="display">{t("How will you use LocalMate?", "आप LocalMate कैसे इस्तेमाल करेंगे?")}</h2>
              <button
                className={`choice icon ${role === "customer" ? "on" : ""}`}
                type="button"
                onClick={() => {
                  setRole("customer");
                  setStep("form");
                }}
              >
                <span className="ico" aria-hidden="true">🙋</span>
                <div>
                  <strong>{t("I need help", "मुझे मदद चाहिए")}</strong>
                  <span className="sub">{t("Post a task, set your price, choose who does it.", "काम पोस्ट करें, कीमत रखें, व्यक्ति चुनें।")}</span>
                </div>
              </button>
              <button
                className={`choice icon ${role === "helper" ? "on" : ""}`}
                type="button"
                onClick={() => {
                  setRole("helper");
                  setStep("form");
                }}
              >
                <span className="ico" aria-hidden="true">🛠️</span>
                <div>
                  <strong>{t("I want to work", "मैं काम करना चाहता हूँ")}</strong>
                  <span className="sub">{t("See nearby tasks and offer your price.", "पास के काम देखें और अपनी कीमत बताएँ।")}</span>
                </div>
              </button>

              <div className="divider" />
              <div className="between">
                <h3>{t("Try the demo", "डेमो देखें")}</h3>
                <span className="pill demo">{t("Sample data", "नमूना डेटा")}</span>
              </div>
              <div className="row">
                <button className="btn ghost grow" type="button" onClick={() => enter("maya", "customer")}>
                  {t("Maya · customer", "माया · कस्टमर")}
                </button>
                <button className="btn ghost grow" type="button" onClick={() => enter("rahul", "helper")}>
                  {t("Rahul · helper", "राहुल · हेल्पर")}
                </button>
              </div>
              <p className="meta" style={{ textAlign: "center" }}>
                {t("Preview build. No SMS, payments, or ID checks are real yet.", "प्रीव्यू बिल्ड। SMS, पेमेंट, और ID जाँच अभी असली नहीं हैं।")}
              </p>
            </div>
          )}

          {step === "form" && (
            <form
              className="stack"
              style={{ marginTop: 14 }}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim().length < 2) return setError(t("Enter your name.", "अपना नाम डालें।"));
                if (phone.replace(/\D/g, "").length < 8) return setError(t("Enter a valid phone number.", "सही फ़ोन नंबर डालें।"));
                setError("");
                setStep("code");
              }}
            >
              <p className="kicker">{role === "customer" ? t("I need help", "मुझे मदद चाहिए") : t("I want to work", "मैं काम करना चाहता हूँ")}</p>
              <h2 className="display">{t("Create your account", "अपना खाता बनाएँ")}</h2>
              <p className="sub">
                {role === "customer"
                  ? t("Verify your phone, then post your first task.", "फ़ोन वेरिफ़ाई करें, फिर पहला काम पोस्ट करें।")
                  : t("Phone check first. Tasks stay locked until safety rules, a category, and an ID review are done.", "पहले फ़ोन चेक। सेफ्टी नियम, कैटेगरी, और ID रिव्यू के बिना काम लॉक रहेंगे।")}
              </p>
              <label className="field">
                <span>{t("Name", "नाम")}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </label>
              <label className="field">
                <span>{t("Phone", "फ़ोन")}</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+91" required />
              </label>
              <label className="field">
                <span>{t("Email", "ईमेल")} <span className="meta">({t("optional", "वैकल्पिक")})</span></span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" />
              </label>
              {error && <p className="note" role="alert">{error}</p>}
              <button className="btn primary wide" type="submit">{t("Send code", "कोड भेजें")}</button>
              <button className="btn ghost wide" type="button" onClick={() => setStep("home")}>{t("Back", "वापस")}</button>
            </form>
          )}

          {step === "code" && (
            <form
              className="stack"
              style={{ marginTop: 14 }}
              onSubmit={async (event) => {
                event.preventDefault();
                if (code.trim().length < 4) return setError(t("Enter the 4-digit code.", "4 अंकों का कोड डालें।"));
                await signUp({ name, phone, email, role, language: lang });
                router.push(role === "helper" ? "/helper/setup" : "/home");
              }}
            >
              <p className="kicker">{t("Step 2 of 2", "चरण 2 / 2")}</p>
              <h2 className="display">{t("Enter the code", "कोड डालें")}</h2>
              <p className="info">{t("Preview: any 4 digits work. No SMS is sent. Phone check ≠ ID clearance.", "प्रीव्यू: कोई भी 4 अंक चलेंगे। SMS नहीं। फ़ोन चेक ≠ ID क्लीयरेंस।")}</p>
              <label className="field">
                <span>{t("Code", "कोड")}</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  style={{ letterSpacing: "0.4em", fontSize: 22, textAlign: "center" }}
                  required
                />
              </label>
              {error && <p className="note" role="alert">{error}</p>}
              <button className="btn primary wide" type="submit">{t("Confirm phone & enter", "फ़ोन कन्फ़र्म कर के अंदर जाएँ")}</button>
              <button className="btn ghost wide" type="button" onClick={() => setStep("form")}>{t("Back", "वापस")}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
