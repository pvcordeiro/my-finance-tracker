"use client";

import { useState, useEffect } from "react";
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

export function GroupSelector() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const groups = user.groups || [];
    const active = user.current_group_id || null;
    if (groups.length === 1) {
      const sole = groups[0];
      if (active !== sole.group_id) {
        fetch("/api/switch-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: sole.group_id }),
          credentials: "include",
        })
          .then((res) => {
            if (res.ok) refreshUser();
          })
          .catch(() => {
            /* silent */
          });
      }
      return;
    }

    if (
      groups.length > 1 &&
      active &&
      !groups.some((g) => g.group_id === active)
    ) {
      const fallback = groups[0];
      fetch("/api/switch-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: fallback.group_id }),
        credentials: "include",
      })
        .then((res) => {
          if (res.ok) refreshUser();
        })
        .catch(() => {
          /* silent */
        });
    }
  }, [user, refreshUser]);

  if (!user || !user.groups || user.groups.length <= 1) {
    return null;
  }

  const currentGroup = user.groups.find(
    (g) => g.group_id === user.current_group_id
  );
  const currentGroupName = currentGroup?.name || "Unknown Group";

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
          "Switched to " +
            (user.groups?.find((g) => g.group_id === groupId)?.name ||
              "selected group")
        );

        window.location.reload();
      } else {
        toast.error("Failed to switch group");
      }
    } catch {
      toast.error("Error switching group");
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
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{currentGroupName}</span>
          <span className="sm:hidden">Group</span>
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
          >
            <Users className="w-4 h-4 mr-2" />
            {group.name}
            {group.group_id === user.current_group_id && (
              <span className="ml-auto text-xs text-muted-foreground">
                Current
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
