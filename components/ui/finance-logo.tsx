import { cn } from "@/lib/utils";

interface FinanceLogoProps {
  className?: string;
  label?: string;
}

/** Finance Tracker mark. The coin and bar accents follow the active user theme. */
export function FinanceLogo({
  className,
  label = "Finance Tracker",
}: FinanceLogoProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label={label}
      className={cn("block shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="120" height="120" rx="34" fill="#102923" />
      <rect x="5" y="5" width="118" height="118" rx="33" fill="none" stroke="#EAF4D8" strokeOpacity=".12" strokeWidth="2" />

      <g transform="translate(10.18 10.87) scale(.92)">
        <path d="M25 99.5H103" stroke="#EAF4D8" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
        <rect x="29" y="77" width="13" height="22" rx="6.5" fill="color-mix(in srgb, hsl(var(--primary)) 55%, white)" />
        <rect x="51" y="63" width="13" height="36" rx="6.5" fill="color-mix(in srgb, hsl(var(--primary)) 75%, white)" />
        <rect x="73" y="47" width="13" height="52" rx="6.5" fill="hsl(var(--primary))" />

        <path d="M24 80C37 78 41 68 52 68C63 68 68 55 78 53C88 51 92 43 101 34" fill="none" stroke="#F4F5E9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M91 34H101V44" fill="none" stroke="#F4F5E9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx="32" cy="34" r="18" fill="hsl(var(--primary))" stroke="#102923" strokeWidth="4" />
        <circle cx="32" cy="34" r="10.5" fill="none" stroke="#102923" strokeOpacity=".4" strokeWidth="1.5" />
        <path d="M32 27V41M36 29.5C34.9 28.4 33.5 28 32 28C29.8 28 28.5 29.1 28.5 30.7C28.5 34.4 35.7 32.9 35.7 36.7C35.7 38.4 34.2 39.6 32 39.6C30.3 39.6 28.8 39 27.7 37.9" fill="none" stroke="#102923" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
