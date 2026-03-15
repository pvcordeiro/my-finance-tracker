/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  runtimeCaching: [
    // App HTML pages — NetworkFirst so offline navigation serves cached shell
    {
      matcher({ request }) {
        return (
          request.mode === "navigate" &&
          !request.url.includes("/api/") &&
          !request.url.includes("/_next/")
        );
      },
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && (response.status === 0 || response.status === 200)) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },
    // Auth session — NetworkFirst, fallback keeps user "logged in" offline
    {
      matcher({ url }) {
        return /^\/api\/auth\/session/.test(url.pathname);
      },
      handler: new NetworkFirst({
        cacheName: "auth-session-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && (response.status === 0 || response.status === 200)) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },
    // Finance entries — NetworkFirst, fallback to cache when offline
    {
      matcher({ url }) {
        return /^\/api\/entries($|\?)/.test(url.pathname + url.search);
      },
      handler: new NetworkFirst({
        cacheName: "entries-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && (response.status === 0 || response.status === 200)) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },
    // Bank amount — NetworkFirst, fallback to cache when offline
    {
      matcher({ url }) {
        return /^\/api\/bank-amount($|\?)/.test(url.pathname + url.search);
      },
      handler: new NetworkFirst({
        cacheName: "bank-amount-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && (response.status === 0 || response.status === 200)) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },
    // Next.js static assets — CacheFirst (content-hashed, safe to cache forever)
    {
      matcher({ url }) {
        return /^\/_next\/static\//.test(url.pathname);
      },
      handler: new CacheFirst({
        cacheName: "next-static-cache",
      }),
    },
    // Next.js image optimization — StaleWhileRevalidate
    {
      matcher({ url }) {
        return /^\/_next\/image\?/.test(url.pathname + url.search);
      },
      handler: new StaleWhileRevalidate({
        cacheName: "next-image-cache",
      }),
    },
    // Public static assets (icons, manifest, etc.) — CacheFirst
    {
      matcher({ url }) {
        return /^\/(?:icon-|manifest).*\.(png|json|webmanifest)$/.test(url.pathname);
      },
      handler: new CacheFirst({
        cacheName: "static-assets-cache",
      }),
    },
  ],
});

serwist.addEventListeners();
