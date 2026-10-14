import type React from "react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { PrivacyProvider } from "@/hooks/use-privacy";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { NoGroupOverlay } from "@/components/finance/no-group-overlay";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { LanguageProvider } from "@/hooks/use-language";
import { SerwistProvider } from "./serwist";
import { DevelopmentServiceWorkerCleanup } from "@/components/pwa/development-service-worker-cleanup";
import { GuidedTour } from "@/components/finance/guided-tour";
import { FirstLoginPreferences } from "@/components/auth/first-login-preferences";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Finance Tracker - Take Control of Your Finances",
  description:
    "Track income, manage expenses, and budget smarter with this modern finance tracker.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Finance Tracker - Take Control of Your Finances",
    description:
      "Track income, manage expenses, and budget smarter with this modern finance tracker.",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Finance Tracker",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Finance Tracker - Take Control of Your Finances",
    description:
      "Track income, manage expenses, and budget smarter with this modern finance tracker.",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance Tracker",
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: ["/icon-192.png"],
    apple: [
      {
        url: "/icon-192.png?v=3",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style>{`
html {
  font-family: ${dmSans.style.fontFamily};
  --font-sans: ${dmSans.variable};
}
        `}</style>
      </head>
      <body
        className={`${dmSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <SerwistProvider>
          <DevelopmentServiceWorkerCleanup />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
              <LanguageProvider>
                <PrivacyProvider>
                  <PWAInstallPrompt />
                  <OfflineBanner />
                  {children}
                  <FirstLoginPreferences />
                  <GuidedTour />
                  <NoGroupOverlay />
                  <Suspense fallback={null}>
                    <MobileBottomNav />
                  </Suspense>
                  <Toaster />
                </PrivacyProvider>
              </LanguageProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
