"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

const ACCENT_COLORS: Record<
  string,
  { hue: string; lightModeLightness?: string; darkModeLightness?: string }
> = {
  blue: { hue: "217" },
  purple: { hue: "270" },
  yellow: { hue: "65", lightModeLightness: "42%" },
  orange: { hue: "25" },
  pink: { hue: "330" },
  red: { hue: "0" },
  teal: { hue: "180", lightModeLightness: "38%" },
  indigo: { hue: "240" },
  amber: { hue: "45", lightModeLightness: "42%" },
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [currentAccent, setCurrentAccent] = React.useState<string | null>(null);

  const applyAccentColor = React.useCallback((accentColor: string) => {
    if (!ACCENT_COLORS[accentColor]) return;

    const color = ACCENT_COLORS[accentColor];
    const root = document.documentElement;

    const isDark = root.classList.contains("dark");

    const lightness =
      !isDark && color.lightModeLightness
        ? color.lightModeLightness
        : isDark && color.darkModeLightness
        ? color.darkModeLightness
        : "60%";

    root.style.setProperty("--primary", `${color.hue} 91% ${lightness}`);
    root.style.setProperty("--ring", `${color.hue} 91% ${lightness}`);
  }, []);

  React.useEffect(() => {
    const applyUserAccentColor = async () => {
      try {
        const response = await fetch("/api/user/accent-color", {
          credentials: "include",
        });

        if (response.status === 401) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.accentColor) {
            setCurrentAccent(data.accentColor);
            applyAccentColor(data.accentColor);
          }
        }
      } catch (error) {
        console.debug("Accent color not loaded:", error);
      }
    };

    applyUserAccentColor();

    const handleAccentColorChange = (event: CustomEvent) => {
      const newColor = event.detail;
      setCurrentAccent(newColor);
      applyAccentColor(newColor);
    };

    window.addEventListener(
      "accentColorChanged",
      handleAccentColorChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "accentColorChanged",
        handleAccentColorChange as EventListener
      );
    };
  }, [applyAccentColor]);

  React.useEffect(() => {
    if (!currentAccent) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          applyAccentColor(currentAccent);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [currentAccent, applyAccentColor]);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
