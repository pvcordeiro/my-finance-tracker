import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CurrencyAmountInputProps = React.ComponentProps<typeof Input> & {
  currencySymbol: string;
  prefixClassName?: string;
};

/** An amount input whose text inset grows with multi-character currency symbols. */
export function CurrencyAmountInput({
  currencySymbol,
  className,
  prefixClassName,
  style,
  ...inputProps
}: CurrencyAmountInputProps) {
  const prefixRef = useRef<HTMLSpanElement | null>(null);
  const [prefixWidth, setPrefixWidth] = useState(0);

  useLayoutEffect(() => {
    const prefix = prefixRef.current;
    if (!prefix) return;

    const measure = () => {
      setPrefixWidth(prefix.getBoundingClientRect().width);
    };

    measure();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measure)
      : null;
    observer?.observe(prefix);
    document.fonts?.ready.then(measure);
    return () => observer?.disconnect();
  }, [currencySymbol]);

  return (
    <div className="relative min-w-0">
      <span
        ref={prefixRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 w-max -translate-y-1/2 whitespace-nowrap text-muted-foreground",
          prefixClassName
        )}
      >
        {currencySymbol}
      </span>
      <Input
        {...inputProps}
        className={className}
        style={{
          ...style,
          paddingInlineStart: `${prefixWidth ? prefixWidth + 24 : 48}px`,
        }}
      />
    </div>
  );
}
