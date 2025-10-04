"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
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
  magenta: { hue: "300" },
  cyan: { hue: "190", lightModeLightness: "38%" },
  indigo: { hue: "240" },
  amber: { hue: "45", lightModeLightness: "42%" },
};

function ThemeManager() {
  const { setTheme } = useTheme();
  const [currentAccent, setCurrentAccent] = React.useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const setThemeRef = React.useRef(setTheme);

  React.useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  const applyAccentColor = React.useCallback(() => {
    if (!currentAccent || !ACCENT_COLORS[currentAccent]) return;

    const color = ACCENT_COLORS[currentAccent];
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
  }, [currentAccent]);

  const applyUserPreferences = React.useCallback(async (skipTheme = false) => {
    try {
      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();

        if (sessionData.user) {
          if (!skipTheme && sessionData.user.theme_preference) {
            setThemeRef.current(sessionData.user.theme_preference);
          }

          if (sessionData.user.accent_color) {
            setCurrentAccent(sessionData.user.accent_color);
          }
        }
      }
    } catch (error) {
      console.debug("User preferences not loaded:", error);
    }
  }, []);

  React.useEffect(() => {
    if (currentAccent) {
      const timer = setTimeout(() => {
        applyAccentColor();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentAccent, applyAccentColor]);

  React.useEffect(() => {
    if (isInitialLoad) {
      applyUserPreferences(false);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, applyUserPreferences]);

  React.useEffect(() => {
    const handleUserLogin = () => {
      applyUserPreferences(false);
    };

    const handleUserLogout = () => {
      setThemeRef.current("system");
      setCurrentAccent("blue");
    };

    window.addEventListener("userLoggedIn", handleUserLogin);
    window.addEventListener("userLoggedOut", handleUserLogout);

    return () => {
      window.removeEventListener("userLoggedIn", handleUserLogin);
      window.removeEventListener("userLoggedOut", handleUserLogout);
    };
  }, [applyUserPreferences, applyAccentColor]);

  React.useEffect(() => {
    const handleAccentColorChange = (event: CustomEvent) => {
      const newColor = event.detail;
      setCurrentAccent(newColor);
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
  }, []);

  React.useEffect(() => {
    if (!currentAccent) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          applyAccentColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [currentAccent, applyAccentColor]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeManager />
      {children}
    </NextThemesProvider>
  );
}
