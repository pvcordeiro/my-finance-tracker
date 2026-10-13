"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from "next-themes";

const ACCENT_COLORS: Record<
  string,
  {
    hue: string;
    lightModeLightness?: string;
    darkModeLightness?: string;
    accentLightLightness?: string;
    accentDarkLightness?: string;
  }
> = {
  blue: { hue: "217" },
  purple: { hue: "270" },
  yellow: {
    hue: "65",
    lightModeLightness: "42%",
  },
  orange: { hue: "25" },
  pink: { hue: "330" },
  magenta: { hue: "300" },
  cyan: { hue: "190", lightModeLightness: "38%" },
  indigo: { hue: "240" },
  amber: {
    hue: "45",
    lightModeLightness: "42%",
  },
};

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const channel = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [channel(0), channel(8), channel(4)];
}

function relativeLuminance(rgb: number[]) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return channel;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(first: number[], second: number[]) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function getContrastTextLightness(hue: string, saturation: number, isDark: boolean) {
  const background = isDark
    ? [26 / 255, 28 / 255, 30 / 255]
    : [241 / 255, 242 / 255, 243 / 255];
  const preferred = isDark ? 74 : 30;
  let best = preferred;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let lightness = 0; lightness <= 100; lightness++) {
    if (getContrastRatio(hslToRgb(Number(hue), saturation, lightness), background) < 4.5) {
      continue;
    }
    const distance = Math.abs(lightness - preferred);
    if (distance < bestDistance) {
      best = lightness;
      bestDistance = distance;
    }
  }
  return best;
}

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
    root.style.setProperty(
      "--primary-contrast",
      `${color.hue} 91% ${getContrastTextLightness(color.hue, 91, isDark)}%`
    );
    const primaryRgb = hslToRgb(Number(color.hue), 91, Number.parseFloat(lightness));
    const darkForeground = [0.04, 0.05, 0.06];
    const lightForeground = [1, 1, 1];
    const useDarkForeground =
      getContrastRatio(primaryRgb, darkForeground) >=
      getContrastRatio(primaryRgb, lightForeground);
    root.style.setProperty(
      "--primary-foreground",
      useDarkForeground ? "210 10% 5%" : "0 0% 100%"
    );
    root.style.setProperty(
      "--accent",
      `${color.hue} ${isDark ? "70%" : "85%"} ${
        isDark
          ? color.accentDarkLightness || "22%"
          : color.accentLightLightness || "88%"
      }`
    );
    root.style.setProperty(
      "--accent-foreground",
      `${color.hue} ${isDark ? "85%" : "95%"} ${isDark ? "88%" : "25%"}`
    );
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
