"use client";

import { EmptyState, Shell, useLang } from "@/components/Shell";
import { timeAgo } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useEffect } from "react";

export default function AlertsPage() {
  const { user, state, markRead } = useStore();
  const { lang, t } = useLang();

  useEffect(() => {
    void markRead();
  }, [markRead]);

  const items = state.notifications.filter((item) => item.userId === user?.id);

  return (
    <Shell>
      <p className="kicker">{t("Inbox", "इनबॉक्स")}</p>
      <h2 className="display">{t("Notifications", "नोटिफ़िकेशन")}</h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {items.length === 0 && (
          <EmptyState glyph="🔔" title={t("No alerts yet", "अभी कोई अलर्ट नहीं")} body={t("Offers, messages, and payments show up here.", "ऑफ़र, मैसेज, और पेमेंट यहाँ दिखेंगे।")} />
        )}
        {items.map((item) => (
          <Link key={item.id} href={item.href} className={`card hover ${item.read ? "" : "unread"}`}>
            <div className="between" style={{ alignItems: "flex-start" }}>
              <strong>{lang === "hi" ? item.titleHi : item.titleEn}</strong>
              <span className="meta" style={{ whiteSpace: "nowrap" }}>{timeAgo(item.createdAt, lang)}</span>
            </div>
            <p className="sub" style={{ marginTop: 4 }}>{lang === "hi" ? item.bodyHi : item.bodyEn}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
