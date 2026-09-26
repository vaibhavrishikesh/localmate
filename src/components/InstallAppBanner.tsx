"use client";

import { useLang } from "@/components/Shell";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "lm_install_dismiss_v1";

function isAndroidChrome() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Chrome/i.test(ua) && !/EdgA|OPR|SamsungBrowser/i.test(ua);
}

function isStandalone() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Soft prompt so phones can install LocalMate like an Android app. */
export function InstallAppBanner() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Fallback tip on Android even if the browser event is late
    if (isAndroidChrome()) {
      const timer = window.setTimeout(() => setShow(true), 1800);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show || isStandalone()) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      dismiss();
      return;
    }
    // No native prompt — tip already visible
  };

  return (
    <div className="install-banner" role="region" aria-label={t("Install LocalMate", "LocalMate इंस्टॉल करें")}>
      <div className="install-banner-copy">
        <strong>{t("Get the Android app", "Android ऐप लें")}</strong>
        <span>
          {deferred
            ? t("Install LocalMate on your phone — one tap.", "LocalMate फोन पर इंस्टॉल करें — एक टैप।")
            : t("Chrome menu → Install app / Add to Home screen.", "Chrome मेनू → Install app / होम स्क्रीन पर जोड़ें।")}
        </span>
      </div>
      <div className="install-banner-actions">
        {deferred && (
          <button type="button" className="btn primary small" onClick={() => void install()}>
            {t("Install", "इंस्टॉल")}
          </button>
        )}
        <button type="button" className="btn ghost small" onClick={dismiss}>
          {t("Later", "बाद में")}
        </button>
      </div>
    </div>
  );
}
