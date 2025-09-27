"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Group {
  group_id: number;
  name: string;
}

export function GroupSelector() {
  const { user, refreshUser } = useAuth();
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const groups = user.groups || [];
    const active = user.current_group_id || null;

    // If active group is valid, set it.
    if (active && groups.some((g: Group) => g.group_id === active)) {
      setCurrentGroupId(active);
      return;
    }

    // If only one group, auto-select it and persist via switch endpoint (so backend session updates)
    if (groups.length === 1) {
      const sole = groups[0];
      setCurrentGroupId(sole.group_id);
      // Fire-and-forget sync to backend if different
      if (active !== sole.group_id) {
        fetch("/api/switch-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: sole.group_id }),
          credentials: "include",
        })
          .then((res) => {
            if (res.ok) {
              refreshUser();
            }
          })
          .catch(() => {
            /* silent */
          });
      }
      return;
    }

    // If multiple groups but current is invalid (e.g., original group deleted), pick first available and persist.
    if (
      groups.length > 1 &&
      active &&
      !groups.some((g: Group) => g.group_id === active)
    ) {
      const fallback = groups[0];
      setCurrentGroupId(fallback.group_id);
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

  const handleGroupChange = async (groupId: string) => {
    try {
      const response = await fetch("/api/switch-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId: parseInt(groupId) }),
        credentials: "include",
      });

      if (response.ok) {
        setCurrentGroupId(parseInt(groupId));
        refreshUser(); // Refresh user data to update current group
        toast.success("Group switched successfully");
      } else {
        toast.error("Failed to switch group");
      }
    } catch (error) {
      toast.error("Error switching group");
    }
  };

  if (!user || !user.groups) {
    return null;
  }

  // If only one group, we auto-selected it above; don't render dropdown UI.
  if (user.groups.length === 1) {
    return null;
  }

  const currentGroup = user.groups.find(
    (g: Group) => g.group_id === currentGroupId
  );

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-muted/50 border-b">
      <span className="text-sm font-medium">Current Group:</span>
      <Select
        value={currentGroupId?.toString()}
        onValueChange={handleGroupChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select group">
            {currentGroup ? currentGroup.name : "Select group"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {user.groups.map((group: Group) => (
            <SelectItem key={group.group_id} value={group.group_id.toString()}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
