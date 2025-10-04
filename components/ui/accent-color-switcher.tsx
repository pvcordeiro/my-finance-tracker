"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

const ACCENT_COLORS = [
  {
    name: "blue",
    label: "Blue",
    hue: "217",
    preview: "hsl(217, 91%, 60%)",
  },
  {
    name: "purple",
    label: "Purple",
    hue: "270",
    preview: "hsl(270, 91%, 60%)",
  },
  {
    name: "yellow",
    label: "Atomic Yellow",
    hue: "65",
    preview: "hsl(65, 100%, 50%)",
    lightModeLightness: "42%",
  },
  {
    name: "orange",
    label: "Orange",
    hue: "25",
    preview: "hsl(25, 95%, 53%)",
  },
  {
    name: "pink",
    label: "Pink",
    hue: "330",
    preview: "hsl(330, 85%, 60%)",
  },
  {
    name: "red",
    label: "Red",
    hue: "0",
    preview: "hsl(0, 84%, 60%)",
  },
  {
    name: "teal",
    label: "Teal",
    hue: "180",
    preview: "hsl(180, 76%, 45%)",
    lightModeLightness: "38%",
  },
  {
    name: "indigo",
    label: "Indigo",
    hue: "240",
    preview: "hsl(240, 76%, 60%)",
  },
  {
    name: "amber",
    label: "Amber",
    hue: "45",
    preview: "hsl(45, 93%, 53%)",
    lightModeLightness: "42%",
  },
];

export function AccentColorSwitcher() {
  const [currentAccent, setCurrentAccent] = useState<string>("blue");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/accent-color", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.accentColor) {
          setCurrentAccent(data.accentColor);
        }
      })
      .catch((err) => console.error("Failed to fetch accent color:", err));
  }, []);

  const handleColorChange = async (colorName: string) => {
    setLoading(true);

    try {
      const response = await fetch("/api/user/accent-color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accentColor: colorName }),
      });

      if (response.ok) {
        setCurrentAccent(colorName);

        window.dispatchEvent(
          new CustomEvent("accentColorChanged", { detail: colorName })
        );
        toast.success("Accent color updated successfully");
      } else {
        toast.error("Failed to update accent color");
      }
    } catch (error) {
      console.error("Error updating accent color:", error);
      toast.error("Failed to update accent color");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {ACCENT_COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => handleColorChange(color.name)}
            disabled={loading}
            className="relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor:
                currentAccent === color.name
                  ? color.preview
                  : "hsl(var(--border))",
              backgroundColor:
                currentAccent === color.name
                  ? "hsl(var(--muted))"
                  : "hsl(var(--card))",
            }}
          >
            <div
              className="w-10 h-10 rounded-full shadow-md"
              style={{ backgroundColor: color.preview }}
            />
            <span className="text-sm font-medium">{color.label}</span>
            {currentAccent === color.name && (
              <div
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: color.preview }}
              >
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
