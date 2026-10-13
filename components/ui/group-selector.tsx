"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";

export function GroupSelector() {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const isOnline = useOnline();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !user.groups || user.groups.length <= 1) {
    return null;
  }

  const currentGroup = user.groups.find(
    (g) => g.group_id === user.current_group_id
  );
  const currentGroupName = currentGroup?.name || t("settings.unknownGroup");

  const handleGroupSwitch = async (groupId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/switch-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId }),
        credentials: "include",
      });

      if (response.ok) {
        await refreshUser();
        toast.success(
          `${t("settings.switchedTo")} ${
            user.groups?.find((g) => g.group_id === groupId)?.name ||
            t("settings.selectedGroup")
          }`
        );

      } else {
        toast.error(t("settings.failedToSwitch"));
      }
    } catch {
      toast.error(t("settings.errorSwitching"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${currentGroupName}. ${t("common.groupSwitchInfo")}`}
          className="flex items-center gap-2"
          disabled={isLoading || !isOnline}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{currentGroupName}</span>
          <span className="sm:hidden">{t("settings.group")}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.groups.map((group) => (
          <DropdownMenuItem
            key={group.group_id}
            onClick={() => handleGroupSwitch(group.group_id)}
            className={`cursor-pointer ${
              group.group_id === user.current_group_id ? "bg-accent" : ""
            }`}
            disabled={group.group_id === user.current_group_id}
          >
            <Users className="w-4 h-4 mr-2" />
            {group.name}
            {group.group_id === user.current_group_id && (
              <span className="ml-auto text-xs text-muted-foreground">
                {t("settings.current")}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
