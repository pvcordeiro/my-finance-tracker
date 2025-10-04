"use client";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NoGroupOverlay({ className }: { className?: string }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    if (pathname === "/user") return;
    if (user && Array.isArray(user.groups) && user.groups.length === 0) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mounted, user, pathname]);

  if (!mounted || isLoading) return null;
  if (pathname === "/user") return null;
  if (!user) return null;
  const hasGroups = Array.isArray(user.groups) && user.groups.length > 0;
  if (hasGroups) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="absolute inset-0 bg-black/30 dark:bg-background/60 backdrop-blur-sm cursor-not-allowed transition-colors" />
      <div
        className={cn(
          "relative pointer-events-auto w-full max-w-md mx-10 sm:mx-auto rounded-lg border border-amber-500/60 bg-amber-50/95 dark:bg-amber-900/40 p-6 shadow-xl text-amber-900 dark:text-amber-100 animate-in fade-in zoom-in-95 backdrop-blur-sm",
          className
        )}
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 shrink-0" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                No Group Membership
              </h2>
              <p className="text-sm leading-relaxed">
                You currently are not a member of any group. Until an
                administrator adds you to a group, you cannot save changes.
              </p>
            </div>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                Ask an admin to add you to an existing group or create a new one
              </li>
              <li>Refresh after being added to dismiss this notice</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
