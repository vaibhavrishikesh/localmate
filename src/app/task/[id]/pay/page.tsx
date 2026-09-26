"use client";

import { Avatar, StatusSteps } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { money, splitFee } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, state, holdPayment, paymentFor } = useStore();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [modeLabel, setModeLabel] = useState<string>("simulated");
  const task = state.tasks.find((item) => item.id === params.id);
  if (!task || !user) return <Shell><p className="empty">{t("Task not found.", "काम नहीं मिला।")}</p></Shell>;

  const payment = paymentFor(task.id);
  const amount = task.agreedAmount ?? task.budget;
  const parts = splitFee(amount);
  const helper = state.users.find((item) => item.id === task.helperId);
  const ready = task.status === "pay" || task.status === "review" || task.status === "completed";
  const isOwner = user.id === task.customerId;
  const held = payment?.status === "held";
  const released = payment?.status === "released";

  useEffect(() => {
    setModeLabel(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? "razorpay" : "simulated");
  }, []);

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push(`/task/${task.id}`)}>{t("Task", "काम")}</button>
      <div className="between">
        <p className="kicker">{t("Payment hold", "पेमेंट होल्ड")}</p>
        <div className="row" style={{ gap: 6 }}>
          {modeLabel === "simulated" && (
            <span className="pill wait">{t("SIMULATED", "सिम्युलेटेड")}</span>
          )}
          {held && <span className="pill live">{t("In hold", "होल्ड में")}</span>}
          {released && <span className="pill done">{t("Released to helper", "हेल्पर को रिलीज़")}</span>}
          {!payment && task.status === "pay" && <span className="pill wait">{t("Awaiting hold", "होल्ड बाकी")}</span>}
        </div>
      </div>
      <h2 className="display">{isOwner ? t("You pay into hold", "आप होल्ड में देंगे") : t("Payout", "भुगतान")}</h2>
      <p className="price big" style={{ marginTop: 4 }}>{money(isOwner ? parts.total : parts.helper)}</p>
      <StatusSteps status={task.status} />

      <div className="card" style={{ marginTop: 16 }}>
        {helper && (
          <div className="row" style={{ marginBottom: 12 }}>
            <Avatar name={helper.name} size={40} />
            <div className="grow">
              <strong>{helper.name}</strong>
              <p className="meta">{t("Helper", "हेल्पर")}</p>
            </div>
          </div>
        )}
        <div className="split">
          <div><span>{t("Task amount (commission base)", "काम की राशि (कमीशन बेस)")}</span><strong>{money(parts.total)}</strong></div>
          <div><span>{t("LocalMate commission 10%", "LocalMate कमीशन 10%")}</span><span>− {money(parts.fee)}</span></div>
          <div className="total"><span>{t("Helper gross earnings", "हेल्पर की ग्रॉस कमाई")}</span><strong style={{ color: "var(--green)" }}>{money(parts.helper)}</strong></div>
        </div>
        <p className="meta" style={{ marginTop: 10 }}>
          {t(
            "Gateway fees & taxes are separate ledger lines — not silently taken from helper earnings. This is not bank escrow.",
            "गेटवे फीस और टैक्स अलग लेजर लाइन हैं — हेल्पर की कमाई से चुपके से नहीं काटे जाते। यह बैंक एस्क्रो नहीं है।",
          )}
        </p>
      </div>

      <p className="info" style={{ marginTop: 12 }}>
        {t(
          "Amount is locked on the server when the offer is accepted. LocalMate records a settlement hold until you confirm the job. Real Razorpay Route transfers require Linked Account KYC (not enabled until credentials + approval).",
          "ऑफ़र स्वीकार होते ही राशि सर्वर पर लॉक हो जाती है। काम कन्फ़र्म होने तक settlement hold। असली Razorpay Route के लिए Linked Account KYC चाहिए।",
        )}
      </p>

      {!isOwner && held && (
        <p className="ok" style={{ marginTop: 12 }}>
          {t("Payment is in hold. You are paid when the customer confirms.", "पेमेंट होल्ड में है। कस्टमर कन्फ़र्म करे तब आपको मिलेगा।")}
        </p>
      )}
      {!isOwner && released && (
        <p className="ok" style={{ marginTop: 12 }}>
          {t(`Released to you: ${money(payment!.helperAmount)}`, `आपको रिलीज़: ${money(payment!.helperAmount)}`)}
        </p>
      )}
      {!isOwner && !payment && (
        <p className="meta" style={{ marginTop: 12 }}>{t("Waiting for the customer to place funds in hold.", "कस्टमर के होल्ड में पैसे डालने का इंतज़ार।")}</p>
      )}

      {isOwner && task.status === "pay" && !held && (
        <button
          className="btn primary wide"
          style={{ marginTop: 16 }}
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              // Simulated path (default): existing server hold. Razorpay Checkout wires in when keys exist.
              await holdPayment(task.id);
              router.push(`/task/${task.id}/review`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon d={ICONS.lock} size={16} />{" "}
          {busy
            ? t("Holding…", "होल्ड हो रहा है…")
            : t(`Place ${money(amount)} in hold (simulated)`, `${money(amount)} होल्ड में डालें (सिम्युलेटेड)`)}
        </button>
      )}
      {isOwner && held && (
        <p className="ok" style={{ marginTop: 14 }}>
          {t("In hold. Confirm the job on the next screen to release pay to the helper.", "होल्ड में है। अगली स्क्रीन पर काम कन्फ़र्म करें — तब हेल्पर को पेमेंट मिलेगी।")}
        </p>
      )}
      {isOwner && released && (
        <p className="ok" style={{ marginTop: 14 }}>{t("Released to helper after your confirm.", "आपके कन्फ़र्म के बाद हेल्पर को रिलीज़ हो गया।")}</p>
      )}
      {!ready && (
        <p className="meta" style={{ marginTop: 14 }}>{t("Payment opens when the task is marked done.", "काम पूरा मार्क होने पर पेमेंट खुलेगा।")}</p>
      )}
    </Shell>
  );
}
