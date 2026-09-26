"use client";

import { RegisterSW } from "@/components/RegisterSW";
import { StoreProvider } from "@/lib/store";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <RegisterSW />
      {children}
    </StoreProvider>
  );
}
