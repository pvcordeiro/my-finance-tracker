"use client";
import { useLanguage } from "@/hooks/use-language";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`border-4 border-primary border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${className}`}
    />
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className = "" }: LoadingStateProps) {
  const { t } = useLanguage();
  const displayMessage = message || t("common.loading");

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">{displayMessage}</p>
      </div>
    </div>
  );
}

export function FullPageLoader({ message }: { message?: string }) {
  const { t } = useLanguage();
  const displayMessage = message || t("common.loading");

  return (
    <div className="flex items-center justify-center p-4 min-h-screen">
      <LoadingState message={displayMessage} />
    </div>
  );
}
