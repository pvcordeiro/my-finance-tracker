"use client";

import { useState } from "react";
import { Check, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface GroupSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupSelectorMenuItem({
  onOpenChange,
}: Pick<GroupSelectorProps, "onOpenChange">) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isOnline = useOnline();

  if (!user?.groups || user.groups.length <= 1) return null;

  return (
    <DropdownMenuItem
      onSelect={() => onOpenChange(true)}
      disabled={!isOnline}
      className="cursor-pointer"
    >
      <Users className="mr-2 h-4 w-4" />
      {t("settings.groupSelection")}
    </DropdownMenuItem>
  );
}

export function GroupSelectorDialog({ open, onOpenChange }: GroupSelectorProps) {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const isOnline = useOnline();
  const [switchingGroupId, setSwitchingGroupId] = useState<number | null>(null);

  if (!user?.groups || user.groups.length <= 1) return null;
  const groups = user.groups;

  const handleGroupSwitch = async (groupId: number) => {
    if (!isOnline || switchingGroupId !== null || groupId === user.current_group_id) {
      return;
    }

    setSwitchingGroupId(groupId);
    try {
      const response = await fetch("/api/switch-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
        credentials: "include",
      });

      if (!response.ok) {
        toast.error(t("settings.failedToSwitch"));
        return;
      }

      await refreshUser();
      toast.success(
        `${t("settings.switchedTo")} ${
          groups.find((group) => group.group_id === groupId)?.name ||
          t("settings.selectedGroup")
        }`
      );
    } catch (error) {
      console.error("Error switching group:", error);
      toast.error(t("settings.errorSwitching"));
    } finally {
      setSwitchingGroupId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.groupSelection")}</DialogTitle>
          <DialogDescription>{t("settings.groupSelectionDescription")}</DialogDescription>
        </DialogHeader>
          <div className="space-y-2">
          {groups.map((group) => {
            const isCurrent = group.group_id === user.current_group_id;
            const isSwitching = switchingGroupId === group.group_id;

            return (
              <Button
                key={group.group_id}
                type="button"
                variant="outline"
                className={`h-auto w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  isCurrent ? "border-primary bg-primary/5 hover:bg-primary/10" : ""
                }`}
                disabled={!isOnline || switchingGroupId !== null}
                onClick={() => void handleGroupSwitch(group.group_id)}
                aria-current={isCurrent ? "true" : undefined}
              >
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                {isSwitching ? (
                  <span className="shrink-0 text-xs text-muted-foreground" role="status">
                    {t("common.loading")}
                  </span>
                ) : isCurrent ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    <Check className="h-4 w-4" />
                    {t("settings.current")}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
