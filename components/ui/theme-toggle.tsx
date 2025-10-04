"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);

    try {
      await fetch("/api/user/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  if (!mounted) {
    return <div className="h-10 w-full" />;
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="flex gap-2">
      {themes.map((themeOption) => {
        const Icon = themeOption.icon;
        const isActive = theme === themeOption.value;

        return (
          <Button
            key={themeOption.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleThemeChange(themeOption.value)}
            className="flex-1 gap-2"
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{themeOption.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
