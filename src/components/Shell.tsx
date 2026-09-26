"use client";

import { isClearedHelper, tx } from "@/lib/catalog";
import { textDir } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function useLang() {
  const { state } = useStore();
  const lang: Lang = state.uiLang ?? "en";
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = textDir(lang);
  }, [lang]);
  const t = (en: string, hi: string, vars?: Record<string, string | number>) => {
    let text = tx(lang, en, hi);
    if (!vars) return text;
    for (const [key, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${key}}`, String(value));
    }
    return text;
  };
  return { lang, t };
}

export const ICONS = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21h4",
  user: "M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Zm-3 9 2 2 4-4",
  translate: "M4 5h8M8 3v2M6 5c0 4 2 7 6 9M10 5c0 3-2 6-5 8M13 20l4-9 4 9M14.5 17h5",
  chat: "M21 12a8 8 0 0 1-8 8H7l-4 3v-11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z",
  check: "M5 12l5 5L20 7",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z",
};

export function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TopBar({ tall = false, tagline }: { tall?: boolean; tagline?: string }) {
  const { t } = useLang();
  return (
    <header className={`topbar ${tall ? "tall" : ""}`}>
      <div>
        <div className="brand">LocalMate</div>
        {tagline ? (
          <span className="tag">{tagline}</span>
        ) : (
          <span className="tag">{t("Need something done? Find a trusted local.", "कोई काम करवाना है? भरोसेमंद लोकल ढूँढें।")}</span>
        )}
      </div>
      <span className="loc">
        <Icon d={ICONS.pin} size={14} />
        {t("Rishikesh", "ऋषिकेश")}
      </span>
    </header>
  );
}

export function EmptyState({ glyph, title, body, children }: { glyph: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="glyph" aria-hidden="true">{glyph}</span>
      <strong>{title}</strong>
      {body && <p className="meta">{body}</p>}
      {children}
    </div>
  );
}

export function Splash() {
  const { lang } = useLang();
  return (
    <div className="stage">
      <div className="phone" dir={textDir(lang)}>
        <TopBar />
        <div className="screen stack" aria-busy="true">
          <div className="skeleton" style={{ height: 28, width: "70%" }} />
          <div className="skeleton" style={{ height: 16, width: "50%" }} />
          <div className="skeleton" style={{ height: 76 }} />
          <div className="cats">
            {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 54 }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { ready, user, state, signIn } = useStore();
  const { lang, t } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  if (!ready || !user) return <Splash />;

  const unread = state.notifications.filter((item) => item.userId === user.id && !item.read).length;
  const helper = user.role === "helper";
  const items = helper
    ? [
        { href: isClearedHelper(user) ? "/feed" : "/helper/setup", label: t("Nearby", "पास"), icon: ICONS.pin },
        { href: "/tasks", label: t("Jobs", "काम"), icon: ICONS.list },
        { href: "/alerts", label: t("Alerts", "अलर्ट"), icon: ICONS.bell },
        { href: "/profile", label: t("Profile", "प्रोफ़ाइल"), icon: ICONS.user },
      ]
    : [
        { href: "/home", label: t("Home", "होम"), icon: ICONS.home },
        { href: "/tasks", label: t("Tasks", "काम"), icon: ICONS.list },
        { href: "/alerts", label: t("Alerts", "अलर्ट"), icon: ICONS.bell },
        { href: "/profile", label: t("Profile", "प्रोफ़ाइल"), icon: ICONS.user },
      ];

  const demo = user.id === "maya" || user.id === "rahul";

  return (
    <div className="stage">
      <div className="phone" dir={textDir(lang)}>
        <TopBar />
        {demo && (
          <div className="demo">
            <span>
              <span className="pill demo" style={{ marginRight: 8, fontSize: 11 }}>{t("Demo", "डेमो")}</span>
              {user.id === "maya"
                ? t("Maya · needs help", "माया · मदद चाहिए")
                : t("Rahul · helper", "राहुल · हेल्पर")}
            </span>
            <button
              type="button"
              onClick={async () => {
                const next = user.id === "maya" ? "rahul" : "maya";
                await signIn(next);
                router.push(next === "rahul" ? "/feed" : "/home");
              }}
            >
              {user.id === "maya" ? t("Helper view", "हेल्पर देखें") : t("Customer view", "कस्टमर देखें")}
            </button>
          </div>
        )}
        <InstallAppBanner />
        <main className="screen">{children}</main>
        <nav className="nav" aria-label="Main">
          {items.map((item) => {
            const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
                <Icon d={item.icon} />
                {item.label}
                {item.href === "/alerts" && unread > 0 && <i className="dot" aria-label={`${unread} unread`} />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
