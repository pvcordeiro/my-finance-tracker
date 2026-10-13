import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface LanguageFlagProps extends SVGProps<SVGSVGElement> {
  language: "en" | "pt" | string;
}

/** Small vector flags avoid relying on the device's emoji font. */
export function LanguageFlag({ language, className, ...props }: LanguageFlagProps) {
  if (language === "pt") {
    return (
      <svg viewBox="0 0 36 24" role="img" aria-label="Português" className={cn("inline-block h-7 w-10 shrink-0", className)} {...props}>
        <rect width="36" height="24" fill="#159447" />
        <path d="M18 3 30 12 18 21 6 12Z" fill="#FFDF00" />
        <circle cx="18" cy="12" r="5.3" fill="#2455A4" />
        <path d="M13.3 11.2a8 8 0 0 1 8.9 2.4" fill="none" stroke="#fff" strokeWidth="1.3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 24" role="img" aria-label="English" className={cn("inline-block h-7 w-10 shrink-0", className)} {...props}>
      <rect width="36" height="24" fill="#fff" />
      <path d="M0 0h36v1.85H0zm0 3.69h36v1.85H0zm0 3.69h36v1.85H0zm0 3.69h36v1.85H0zm0 3.69h36v1.85H0zm0 3.69h36v1.85H0zm0 3.69h36V24H0z" fill="#B22234" />
      <path d="M0 0h16v13H0z" fill="#3C3B6E" />
      <g fill="#fff">
        <circle cx="3" cy="2.5" r=".7"/><circle cx="8" cy="2.5" r=".7"/><circle cx="13" cy="2.5" r=".7"/>
        <circle cx="5.5" cy="5.5" r=".7"/><circle cx="10.5" cy="5.5" r=".7"/><circle cx="3" cy="8.5" r=".7"/>
        <circle cx="8" cy="8.5" r=".7"/><circle cx="13" cy="8.5" r=".7"/><circle cx="5.5" cy="11.5" r=".7"/><circle cx="10.5" cy="11.5" r=".7"/>
      </g>
    </svg>
  );
}
