import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // Precache all app pages at SW install time so they work offline
    // even without the user having visited them first.
    additionalManifestEntries: [
      { url: "/", revision: "1" },
      { url: "/manage", revision: "1" },
      { url: "/details", revision: "1" },
      { url: "/user", revision: "1" },
      { url: "/login", revision: "1" },
    ],
    runtimeCaching: [
      // Cache app HTML pages (navigation requests) — NetworkFirst so offline
      // navigation serves the cached shell instead of the /~offline fallback page.
      // Only matches actual page routes, not API or _next paths.
      {
        urlPattern: ({ request }) =>
          request.mode === "navigate" &&
          !request.url.includes("/api/") &&
          !request.url.includes("/_next/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Cache the auth session — Network First with 3s timeout, fallback to cache
      // This keeps the user "logged in" when offline
      {
        urlPattern: /^\/api\/auth\/session/,
        handler: "NetworkFirst",
        options: {
          cacheName: "auth-session-cache",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 1,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (matches session TTL)
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Cache finance entries — Network First, fallback to cached data when offline
      {
        urlPattern: /^\/api\/entries($|\?)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "entries-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Cache bank amount — Network First, fallback to cached data when offline
      {
        urlPattern: /^\/api\/bank-amount($|\?)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "bank-amount-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Next.js static assets — Cache First (they're content-hashed, safe to cache forever)
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
        },
      },
      // Next.js image optimization
      {
        urlPattern: /^\/_next\/image\?.*/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      // Public static assets (icons, manifest, etc.)
      {
        urlPattern: /^\/(?:icon-|manifest).*\.(png|json|webmanifest)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
  fallbacks: {
    document: "/~offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  async rewrites() {
    return [];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
