"use client";

import { Avatar, StatusPill } from "@/components/Bits";
import { ICONS, Icon, Shell, useLang } from "@/components/Shell";
import { translate } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const QUICK = [
  ["On my way", "मैं रास्ते में हूँ"],
  ["I have arrived", "मैं पहुँच गया हूँ"],
  ["Where should we meet?", "हम कहाँ मिलें?"],
  ["I need someone to help me find a local SIM card.", "मुझे लोकल सिम कार्ड ढूँढने में मदद चाहिए।"],
] as const;

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, state, sendMessage } = useStore();
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const task = state.tasks.find((item) => item.id === params.id);
  const messages = state.messages.filter((item) => item.taskId === params.id);
  const otherId = task && user ? (user.id === task.customerId ? task.helperId : task.customerId) : undefined;
  const other = state.users.find((item) => item.id === otherId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  return (
    <Shell>
      <button className="top-link" type="button" onClick={() => router.push(`/task/${params.id}`)}>{t("Task", "काम")}</button>
      {other ? (
        <div className="between">
          <div className="row">
            <Avatar name={other.name} size={40} />
            <div>
              <Link href={`/people/${other.id}`}><strong>{other.name}</strong></Link>
              <p className="meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon d={ICONS.translate} size={13} />
                {other.language === "hi" ? t("Writes in Hindi · auto-translated", "हिंदी में लिखते हैं · अनुवाद अपने आप") : t("Writes in English · auto-translated", "अंग्रेज़ी में लिखते हैं · अनुवाद अपने आप")}
              </p>
            </div>
          </div>
          {task && <StatusPill status={task.status} />}
        </div>
      ) : (
        <h2 className="display">{t("Chat", "चैट")}</h2>
      )}

      {!task || task.status === "looking" ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <span className="glyph" aria-hidden="true">💬</span>
          <strong>{t("Chat opens after you accept someone.", "किसी को स्वीकार करने के बाद चैट खुलेगी।")}</strong>
        </div>
      ) : (
        <>
          <div className="stack" style={{ marginTop: 16, gap: 8 }}>
            {messages.map((message) => {
              if (message.senderId === "system") {
                const line = translate(message.text, lang);
                return <p key={message.id} className="bubble system">{line}</p>;
              }
              const mine = message.senderId === user?.id;
              const shown = translate(message.text, lang);
              const changed = shown.trim().toLowerCase() !== message.text.trim().toLowerCase();
              return (
                <div key={message.id} className={`bubble ${mine ? "mine" : ""}`}>
                  {changed && !mine && (
                    <span className="tr"><Icon d={ICONS.translate} size={11} /> {t("Translated", "अनुवादित")}</span>
                  )}
                  <span style={{ display: "block" }}>{changed ? shown : message.text}</span>
                  {changed && <span className="orig">{message.text}</span>}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="replies" style={{ marginTop: 14 }}>
            {QUICK.map(([en, hi]) => (
              <button key={en} className="chip" type="button" onClick={() => void sendMessage(task.id, en)}>
                {t(en, hi)}
              </button>
            ))}
          </div>
          <form
            className="composer"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!text.trim()) return;
              await sendMessage(task.id, text);
              setText("");
            }}
          >
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("Write a message…", "मैसेज लिखें…")}
              aria-label={t("Message", "मैसेज")}
            />
            <button className="btn primary" type="submit" disabled={!text.trim()}>{t("Send", "भेजें")}</button>
          </form>
        </>
      )}
    </Shell>
  );
}
