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

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Finance Tracker - Take Control of Your Finances",
  description:
    "Track income, manage expenses, and budget smarter with this modern finance tracker.",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance Tracker",
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💸</text></svg>",
      },
    ],
    apple: [
      {
        url: "/icon-192.png",
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
        <style>{`
html {
  font-family: ${dmSans.style.fontFamily};
  --font-sans: ${dmSans.variable};
}
        `}</style>
      </head>
      <body
        className={`${dmSans.variable} font-sans antialiased pb-16 md:pb-0 bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
              <PrivacyProvider>
                <PWAInstallPrompt />
                {children}
                <NoGroupOverlay />
                <Suspense fallback={null}>
                  <MobileBottomNav />
                </Suspense>
                <Toaster />
              </PrivacyProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
