"use client";

import { usePrivacy } from "@/hooks/use-privacy";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

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
  const { formatCurrency } = useLanguage();

  const shouldHide = privacyMode && !isRevealed && !isLoading;

  if (!shouldHide) {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    const formattedValue = format ? format(numValue) : formatCurrency(numValue);

    return (
      <span className={className}>
        {prefix}
        {formattedValue}
        {suffix}
      </span>
    );
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const formattedValue = format ? format(numValue) : formatCurrency(numValue);

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
