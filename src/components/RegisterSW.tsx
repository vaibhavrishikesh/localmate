"use client";

import { useEffect } from "react";

/** Registers the service worker so Android Chrome can install LocalMate as an app. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const ready = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — install still works via browser menu on some devices */
      });
    };
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
  }, []);
  return null;
}
