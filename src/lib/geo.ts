"use client";

import { useEffect, useState } from "react";

export type GeoStatus = "idle" | "asking" | "live" | "denied" | "unavailable";

export type GeoState = {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  updatedAt: number | null;
  request: () => void;
};

const KEY = "localmate-geo-opt-in";

function initialOptIn() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

function initialStatus(): GeoStatus {
  if (typeof window === "undefined") return "idle";
  if (!("geolocation" in navigator)) return "unavailable";
  return "idle";
}

/**
 * Live device position. Nothing is requested until the user opts in once;
 * after that the position is watched while the component is mounted.
 */
export function useGeo(): GeoState {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [status, setStatus] = useState<GeoStatus>(initialStatus);
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy: number; updatedAt: number } | null>(null);

  useEffect(() => {
    if (!optIn || typeof window === "undefined" || !("geolocation" in navigator)) return;
    let active = true;
    const id = navigator.geolocation.watchPosition(
      (result) => {
        if (!active) return;
        setPos({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
          updatedAt: Date.now(),
        });
        setStatus("live");
      },
      (error) => {
        if (!active) return;
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    // Asking is set only once when opt-in starts, via request() or when watch begins.
    setStatus((current) => (current === "live" || current === "denied" || current === "unavailable" ? current : "asking"));
    return () => {
      active = false;
      navigator.geolocation.clearWatch(id);
    };
  }, [optIn]);

  return {
    status,
    lat: pos?.lat ?? null,
    lng: pos?.lng ?? null,
    accuracy: pos?.accuracy ?? null,
    updatedAt: pos?.updatedAt ?? null,
    request: () => {
      if (typeof window !== "undefined") {
        if (!("geolocation" in navigator)) {
          setStatus("unavailable");
          return;
        }
        window.localStorage.setItem(KEY, "1");
      }
      setStatus("asking");
      setOptIn(true);
    },
  };
}
