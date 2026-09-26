"use client";

import { Avatar, LiveMap, SafetySheet, StatusPill, TrustLine } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { areaName, categoryById, categoryLabel, isClearedHelper, localize, money, openJobCount, splitFee, workerBlock, type WorkerBlock } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { CANCEL_REASONS, canTransition, MIN_OFFER_INR, offerErrorMessage, validateOfferAmount } from "@/lib/workflow";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, state, sendOffer, acceptOffer, blocked, cancelTask } = useStore();
  const { lang, t } = useLang();
  const [amount, setAmount] = useState("");
  const [offerError, setOfferError] = useState("");
  const [safety, setSafety] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const task = state.tasks.find((item) => item.id === params.id);

  if (!task || !user) {
    return (
      <Shell>
        <p className="empty">{t("This task is gone.", "यह काम नहीं मिला।")}</p>
      </Shell>
    );
  }

  const customer = state.users.find((item) => item.id === task.customerId);
  const helper = state.users.find((item) => item.id === task.helperId);
  const category = categoryById(task.category);
  const offers = state.offers
    .filter((offer) => offer.taskId === task.id)
    .slice()
    .sort((a, b) => (task.priceMode === "negotiable" ? a.amount - b.amount : b.amount - a.amount));
  const mine = offers.find((offer) => offer.helperId === user.id);
  const clearedOffers = offers.filter((offer) => {
    const person = state.users.find((item) => item.id === offer.helperId);
    return Boolean(person && isClearedHelper(person)) && !hidden.includes(offer.id);
  });
  const title = localize(task.title, task.titleHi, lang);
  const details = localize(task.details, task.detailsHi, lang);
  const when = lang === "hi" && task.whenLabelHi ? task.whenLabelHi : task.whenLabel;
  const route = task.toArea ? `${areaName(task.area, lang)} → ${areaName(task.toArea, lang)}` : areaName(task.area, lang);
  const other = user.id === task.customerId ? helper : customer;
  const parsedOffer = amount === "" ? NaN : Number(amount);
  const offerAmount = task.priceMode === "fixed" ? task.budget : parsedOffer;
  const offerCheck = validateOfferAmount(task.priceMode === "fixed" ? task.budget : parsedOffer, task);
  const isOwner = user.id === task.customerId;
  const gate: WorkerBlock | null = user.role === "helper"
    ? workerBlock(user, task, offerCheck.ok ? offerCheck.amount : task.budget, openJobCount(state.tasks, state.offers, user.id, task.id))
    : null;
  const gateCopy: Record<WorkerBlock, string> = {
    setup: t("Finish worker setup before you can take this.", "यह काम लेने से पहले वर्कर सेटअप पूरा करें।"),
    id: t("Your ID is still in review. Customers cannot hire you yet.", "आपकी ID अभी रिव्यू में है। कस्टमर अभी आपको नहीं चुन सकते।"),
    category: t("This task is outside the work you are cleared for.", "यह काम आपकी क्लीयर कैटेगरी से बाहर है।"),
    amount: t("New workers can only take tasks up to ₹1,000.", "नए वर्कर सिर्फ़ ₹1,000 तक के काम ले सकते हैं।"),
    busy: t("Finish your open task before taking another. New workers get one at a time.", "दूसरा काम लेने से पहले खुला काम पूरा करें। नए वर्कर एक बार में एक काम लेते हैं।"),
    low: t(`Offers start at ₹${MIN_OFFER_INR}.`, `ऑफ़र ₹${MIN_OFFER_INR} से शुरू होते हैं।`),
  };
  const earn = splitFee(offerCheck.ok ? offerCheck.amount : task.budget);
  const canCancel = canTransition(task, "cancel", user.id, user.role).ok;
  const chatOk =
    task.status !== "looking" &&
    task.status !== "cancelled" &&
    task.status !== "flagged" &&
    !(other && blocked(other.id));

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.back()}>{t("Back", "वापस")}</button>
      <div className="between">
        <span className="pill">{category.emoji} {categoryLabel(category, lang)}</span>
        <StatusPill status={task.status} />
      </div>
      <h2 className="display" style={{ marginTop: 10 }}>{title}</h2>
      {lang === "hi" && title !== task.title && <p className="meta">{task.title}</p>}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="between" style={{ alignItems: "flex-end" }}>
          <div>
            <span className="meta">{task.priceMode === "fixed" ? t("Fixed price", "फिक्स्ड कीमत") : t("Budget · offers welcome", "बजट · ऑफ़र दें")}</span>
            <p className="price big">{money(task.agreedAmount ?? task.budget)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong style={{ display: "block" }}>{when}</strong>
            <span className="meta">{route}</span>
          </div>
        </div>
        <div className="divider" style={{ margin: "12px 0" }} />
        <p>{details}</p>
        {lang === "hi" && details !== task.details && <p className="meta" style={{ marginTop: 6 }}>{task.details}</p>}
      </div>

      {task.status === "looking" && (
        <div style={{ marginTop: 12 }}>
          <LiveMap areaId={task.area} height={160} showNavigate={user.role === "helper"} />
        </div>
      )}

      {customer && !isOwner && (
        <Link href={`/people/${customer.id}`} className="card row hover" style={{ marginTop: 12 }}>
          <Avatar name={customer.name} />
          <div className="grow">
            <strong>{customer.name}</strong>
            <TrustLine person={customer} />
            <div className="wrap" style={{ marginTop: 4 }}>
              {customer.phoneVerified && <span className="badge">{t("Phone verified", "फ़ोन वेरिफ़ाइड")}</span>}
              {task.status !== "looking" && user.id === task.helperId && (
                <a className="badge plain" href={`tel:${customer.phone}`} onClick={(event) => event.stopPropagation()}>📞 {customer.phone}</a>
              )}
            </div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)" }}>›</span>
        </Link>
      )}

      {task.status !== "looking" && helper && isOwner && (
        <Link href={`/people/${helper.id}`} className="card row hover" style={{ marginTop: 12 }}>
          <Avatar name={helper.name} />
          <div className="grow">
            <strong>{helper.name}</strong>
            <TrustLine person={helper} />
            <div className="wrap" style={{ marginTop: 4 }}>
              <span className="badge">{t("ID checked", "ID जाँची गई")}</span>
              <a className="badge plain" href={`tel:${helper.phone}`} onClick={(event) => event.stopPropagation()}>📞 {helper.phone}</a>
            </div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)" }}>›</span>
        </Link>
      )}

      <div className="stack" style={{ marginTop: 16 }}>
        {task.status === "looking" && user.role === "helper" && !isOwner && blocked(task.customerId) && (
          <p className="note" role="alert">{t("You cannot apply — you and this customer are blocked.", "अप्लाई नहीं कर सकते — आप और यह कस्टमर ब्लॉक हैं।")}</p>
        )}

        {task.status === "looking" && user.role === "helper" && !isOwner && !blocked(task.customerId) && (
          mine ? (
            <div className="card tint stack" style={{ gap: 6 }}>
              <div className="between">
                <strong>{t("Offer sent", "ऑफ़र भेजा")}</strong>
                <span className="price" style={{ fontSize: 22 }}>{money(mine.amount)}</span>
              </div>
              <p className="meta">{t("Waiting for the customer. You will get an alert when they decide.", "कस्टमर का इंतज़ार। फैसला होने पर आपको अलर्ट मिलेगा।")}</p>
            </div>
          ) : gate ? (
            <div className="card stack">
              <div className="row" style={{ gap: 8 }}><Icon d={ICONS.lock} size={18} /><strong>{t("Not available to you yet", "अभी आपके लिए उपलब्ध नहीं")}</strong></div>
              <p className="sub">{gateCopy[gate]}</p>
              {(gate === "setup" || gate === "id" || gate === "category") && (
                <Link className="btn dark" href="/helper/setup">{t("Worker setup", "वर्कर सेटअप")}</Link>
              )}
            </div>
          ) : (
            <div className="card stack">
              <h3>{task.priceMode === "fixed" ? t("Apply for this task", "इस काम के लिए अप्लाई करें") : t("Make an offer", "ऑफ़र दें")}</h3>
              {task.priceMode === "negotiable" && (
                <label className="field">
                  <span>{t("Your price (₹)", "आपकी कीमत (₹)")}</span>
                  <div className="money-input">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MIN_OFFER_INR}
                      max={task.budget}
                      step={1}
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setOfferError("");
                      }}
                      aria-invalid={Boolean(offerError)}
                      aria-describedby="earn offer-err"
                    />
                  </div>
                  <span className="help" id="earn">
                    {t(`Min ₹${MIN_OFFER_INR} · max budget ${money(task.budget)}`, `न्यूनतम ₹${MIN_OFFER_INR} · अधिकतम बजट ${money(task.budget)}`)}
                  </span>
                </label>
              )}
              {task.priceMode === "fixed" && (
                <p className="meta">{t(`Fixed amount ${money(task.budget)} — you accept this price.`, `फिक्स्ड ${money(task.budget)} — यही कीमत स्वीकार होगी।`)}</p>
              )}
              <div className="split">
                <div><span>{t("Task amount", "काम की रकम")}</span><strong>{money(earn.total)}</strong></div>
                <div><span>{t("LocalMate fee 10%", "LocalMate फ़ीस 10%")}</span><span>− {money(earn.fee)}</span></div>
                <div className="total"><span>{t("You receive", "आपको मिलेंगे")}</span><strong style={{ color: "var(--green)" }}>{money(earn.helper)}</strong></div>
              </div>
              {offerError && <p className="note" role="alert" id="offer-err">{offerError}</p>}
              <button
                className="btn primary wide"
                type="button"
                disabled={sending || (task.priceMode === "negotiable" && !offerCheck.ok)}
                onClick={async () => {
                  if (sending) return;
                  const check = validateOfferAmount(task.priceMode === "fixed" ? task.budget : parsedOffer, task);
                  if (!check.ok) {
                    setOfferError(offerErrorMessage(check.error, lang === "hi" ? "hi" : "en", task.budget));
                    return;
                  }
                  setSending(true);
                  setOfferError("");
                  try {
                    await sendOffer(task.id, check.amount, "I can do this");
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "";
                    if (msg.startsWith("offer:")) {
                      const code = msg.slice(6) as Parameters<typeof offerErrorMessage>[0];
                      setOfferError(offerErrorMessage(code, lang === "hi" ? "hi" : "en", task.budget));
                    } else {
                      setOfferError(t("Could not send offer.", "ऑफ़र नहीं भेजा जा सका।"));
                    }
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {sending
                  ? t("Sending…", "भेज रहे हैं…")
                  : task.priceMode === "fixed"
                    ? t("I can do this", "मैं यह कर सकता हूँ")
                    : t(`Send offer · ${money(offerCheck.ok ? offerCheck.amount : 0)}`, `ऑफ़र भेजें · ${money(offerCheck.ok ? offerCheck.amount : 0)}`)}
              </button>
            </div>
          )
        )}

        {(task.status === "cancelled" || task.status === "flagged") && (
          <div className="card stack">
            <strong>{task.status === "cancelled" ? t("Task cancelled", "काम रद्द") : t("Task flagged for safety review", "सेफ्टी रिव्यू के लिए फ़्लैग")}</strong>
            {task.cancelReason && <p className="meta">{task.cancelReason}</p>}
            {task.flagReason && <p className="meta">{task.flagReason}</p>}
            {task.cancelledAt && <p className="meta">{new Date(task.cancelledAt).toLocaleString()}</p>}
          </div>
        )}

        {task.status === "looking" && isOwner && (
          <>
            <div className="section" style={{ margin: "4px 0 0" }}>
              <h3>{t("Applications", "आवेदन")}</h3>
              <span className="meta">{clearedOffers.length}</span>
            </div>
            {clearedOffers.length === 0 && (
              <div className="empty">
                <span className="glyph" aria-hidden="true">⏳</span>
                <strong>{t("No cleared worker yet", "अभी कोई क्लीयर वर्कर नहीं")}</strong>
                <p className="meta">{t("Only workers who passed setup and ID review can apply. You will get an alert.", "सिर्फ़ सेटअप और ID रिव्यू पास करने वाले वर्कर अप्लाई कर सकते हैं। आपको अलर्ट मिलेगा।")}</p>
              </div>
            )}
            {clearedOffers.map((offer) => {
              const person = state.users.find((item) => item.id === offer.helperId);
              if (!person || !isClearedHelper(person)) return null;
              const newbie = person.tasksCompleted < 5;
              return (
                <div key={offer.id} className="card stack">
                  <div className="row">
                    <Avatar name={person.name} />
                    <div className="grow">
                      <Link href={`/people/${person.id}`}><strong>{person.name}</strong></Link>
                      <TrustLine person={person} />
                    </div>
                    <span className="price" style={{ fontSize: 24 }}>{money(offer.amount)}</span>
                  </div>
                  <div className="wrap">
                    <span className="badge">{t("ID checked", "ID जाँची गई")}</span>
                    <span className="badge">{t("Safety rules accepted", "सेफ्टी नियम माने")}</span>
                    <span className="badge">{t("Pay stays in the app", "पेमेंट ऐप में")}</span>
                    {newbie && <span className="badge pending">{t("New worker · ₹1,000 cap", "नया वर्कर · ₹1,000 सीमा")}</span>}
                  </div>
                  <div className="row">
                    <button className="btn ghost" type="button" onClick={() => setHidden((current) => [...current, offer.id])}>
                      {t("Not now", "अभी नहीं")}
                    </button>
                    <button className="btn primary grow" type="button" onClick={async () => {
                      await acceptOffer(offer.id);
                      router.push(`/task/${task.id}/chat`);
                    }}>
                      <Icon d={ICONS.check} size={16} /> {t("Accept", "स्वीकार करें")}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {task.status !== "looking" && task.status !== "cancelled" && (isOwner || user.id === task.helperId) && (
          <div className="stack">
            {(task.status === "matched" || task.status === "active" || task.status === "awaiting_customer_confirmation" || task.status === "flagged") && (
              <Link className="btn primary wide" href={`/task/${task.id}/work`}><Icon d={ICONS.pin} size={16} /> {t("Open active task", "चालू काम खोलें")}</Link>
            )}
            {chatOk && <Link className="btn dark wide" href={`/task/${task.id}/chat`}><Icon d={ICONS.chat} size={16} /> {t("Open chat", "चैट खोलें")}</Link>}
            {task.status === "pay" && <Link className="btn gold wide" href={`/task/${task.id}/pay`}>{t("Payment", "पेमेंट")}</Link>}
            {task.status === "review" && <Link className="btn gold wide" href={`/task/${task.id}/review`}>{t("Rating", "रेटिंग")}</Link>}
          </div>
        )}

        {canCancel && (
          <button
            className="btn ghost wide"
            type="button"
            disabled={cancelling}
            onClick={async () => {
              const labels = CANCEL_REASONS.map((r, i) => `${i + 1}. ${lang === "hi" ? r.hi : r.en}`).join("\n");
              const pick = window.prompt(
                t("Cancel this task?\nPick a reason number:\n", "काम रद्द?\nकारण नंबर चुनें:\n") + labels,
                "1",
              );
              if (!pick) return;
              const index = Number(pick) - 1;
              const reason = CANCEL_REASONS[index];
              if (!reason) {
                window.alert(t("Invalid reason.", "गलत कारण।"));
                return;
              }
              if (!window.confirm(t("Confirm cancel? The other person will be notified.", "रद्द कन्फ़र्म? दूसरे व्यक्ति को अलर्ट मिलेगा।"))) return;
              setCancelling(true);
              try {
                await cancelTask(task.id, reason.id);
              } finally {
                setCancelling(false);
              }
            }}
          >
            {cancelling ? t("Cancelling…", "रद्द हो रहा है…") : t("Cancel task", "काम रद्द करें")}
          </button>
        )}

        {other && (
          <button className="btn danger wide" type="button" onClick={() => setSafety(true)}>
            <Icon d={ICONS.shield} size={16} /> {t("Report, block, or emergency", "रिपोर्ट, ब्लॉक, या इमरजेंसी")}
          </button>
        )}
      </div>
      {safety && other && <SafetySheet userId={other.id} taskId={task.id} onClose={() => setSafety(false)} />}
    </Shell>
  );
}
