"use client";

import { useEffect, useRef, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface GroupSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GroupName({ name }: { name: string }) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const updateOverflow = () => {
      setOverflows(text.scrollWidth > container.clientWidth + 1);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(container);
    observer.observe(text);
    document.fonts?.ready.then(updateOverflow);
    return () => observer.disconnect();
  }, [name]);

  return (
    <span
      ref={containerRef}
      className="group-name-window w-0 min-w-0 flex-1"
      title={name}
    >
      {overflows ? (
        <span className="group-name-marquee" aria-hidden="true">
          <span ref={textRef}>{name}</span>
          <span>{name}</span>
        </span>
      ) : (
        <span ref={textRef} className="block truncate">{name}</span>
      )}
    </span>
  );
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
      data-tour="tour-group-switch"
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
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (open && user?.current_group_id != null) {
      setSelectedGroupId(user.current_group_id);
    }
  }, [open, user?.current_group_id]);

  if (!user?.groups || user.groups.length <= 1) return null;
  const groups = user.groups;

  const handleGroupSwitch = async () => {
    if (
      !isOnline ||
      switchingGroupId !== null ||
      selectedGroupId === null ||
      selectedGroupId === user.current_group_id
    ) {
      if (selectedGroupId === user.current_group_id) onOpenChange(false);
      return;
    }

    setSwitchingGroupId(selectedGroupId);
    try {
      const response = await fetch("/api/switch-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId }),
        credentials: "include",
      });

      if (!response.ok) {
        toast.error(t("settings.failedToSwitch"));
        return;
      }

      await refreshUser();
      toast.success(
        `${t("settings.switchedTo")} ${
          groups.find((group) => group.group_id === selectedGroupId)?.name ||
          t("settings.selectedGroup")
        }`
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error switching group:", error);
      toast.error(t("settings.errorSwitching"));
    } finally {
      setSwitchingGroupId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] min-w-0 max-h-[85dvh] overflow-x-hidden overflow-y-auto sm:max-w-md"
        hideCloseButton
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("settings.groupSelection")}</DialogTitle>
          <DialogDescription>{t("settings.groupSelectionDescription")}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-2">
          {groups.map((group) => {
            const isCurrent = group.group_id === user.current_group_id;
            const isSelected = group.group_id === selectedGroupId;
            const isSwitching = switchingGroupId === group.group_id;

            return (
              <Button
                key={group.group_id}
                type="button"
                variant="outline"
                className={`group min-h-12 min-w-0 w-full justify-start gap-3 overflow-hidden whitespace-nowrap px-3 py-3 text-left focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-4 ${
                  isSelected ? "border-primary bg-primary/5 hover:bg-primary/10" : ""
                }`}
                disabled={!isOnline || switchingGroupId !== null}
                onClick={() => setSelectedGroupId(group.group_id)}
                aria-current={isCurrent ? "true" : undefined}
                aria-pressed={isSelected}
                aria-label={`${group.name}${isCurrent ? `, ${t("settings.current")}` : ""}`}
              >
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <GroupName name={group.name} />
                {isSwitching ? (
                  <span className="shrink-0 text-xs text-muted-foreground" role="status">
                    {t("common.loading")}
                  </span>
                ) : isCurrent ? (
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {t("settings.current")}
                  </span>
                ) : null}
                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary-contrast" />}
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => void handleGroupSwitch()}
            disabled={!isOnline || switchingGroupId !== null || selectedGroupId === null}
          >
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
