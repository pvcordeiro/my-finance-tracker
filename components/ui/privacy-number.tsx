"use client";

import { usePrivacy } from "@/hooks/use-privacy";
import { cn } from "@/lib/utils";

interface PrivacyNumberProps {
  value: number | string;
  className?: string;
  prefix?: string;
  suffix?: string;
  format?: (value: number) => string;
}

export function PrivacyNumber({
  value,
  className = "",
  prefix = "",
  suffix = "",
  format,
}: PrivacyNumberProps) {
  const { privacyMode, isRevealed, isLoading } = usePrivacy();

  const shouldHide = privacyMode && !isRevealed && !isLoading;

  if (!shouldHide) {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    const formattedValue = format
      ? format(numValue)
      : numValue.toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

    return (
      <span className={className}>
        {prefix}
        {formattedValue}
        {suffix}
      </span>
    );
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const formattedValue = format
    ? format(numValue)
    : numValue.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  const fullText = `${prefix}${formattedValue}${suffix}`;
  const charCount = fullText.length;

  const skeletonWidth = `${charCount * 0.6}em`;

  return (
    <span
      className={cn("inline-block relative", className)}
      style={{ width: skeletonWidth, minWidth: "3em" }}
    >
      <span
        className="absolute inset-0 rounded animate-pulse opacity-40"
        style={{
          background: "currentColor",
        }}
        aria-label="Hidden for privacy"
      />
      <span className="invisible">{fullText}</span>
    </span>
  );
}
