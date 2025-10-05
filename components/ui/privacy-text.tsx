"use client";

import { usePrivacy } from "@/hooks/use-privacy";
import { cn } from "@/lib/utils";

interface PrivacyTextProps {
  value: string;
  className?: string;
}

export function PrivacyText({ value, className = "" }: PrivacyTextProps) {
  const { privacyMode, isRevealed, isLoading } = usePrivacy();

  const shouldHide = privacyMode && !isRevealed && !isLoading;

  if (!shouldHide) {
    return <span className={className}>{value}</span>;
  }

  const charCount = value.length;
  const skeletonWidth = `${Math.max(charCount * 0.5, 3)}em`;

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
      <span className="invisible">{value}</span>
    </span>
  );
}
