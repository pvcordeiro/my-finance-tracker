"use client";

import { SerwistProvider as BaseSerwistProvider } from "@serwist/turbopack/react";
import { createElement, type ReactNode } from "react";

export function SerwistProvider({ children }: { children: ReactNode }) {
  // Registration is intentionally production-only; development must never
  // keep localhost alive from an old offline cache.
  const isProduction = process.env.NODE_ENV === "production";

  return createElement(
    BaseSerwistProvider,
    {
      swUrl: "/serwist/sw.js",
      disable: !isProduction,
      register: isProduction,
      cacheOnNavigation: isProduction,
      reloadOnOnline: isProduction,
    },
    children
  );
}
