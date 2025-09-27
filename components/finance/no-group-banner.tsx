"use client";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function NoGroupBanner({ className }: { className?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  const hasGroups = Array.isArray(user.groups) && user.groups.length > 0;
  if (hasGroups) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 flex items-start gap-3 text-amber-800 dark:text-amber-200 animate-in fade-in slide-in-from-top-2",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="mt-0.5">
        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold mb-1">No Group Membership</p>
        <p>
          You are currently not a member of any group. Your data changes cannot
          be saved. Please contact an administrator to be added to a group.
        </p>
      </div>
    </div>
  );
}
