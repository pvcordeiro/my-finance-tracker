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
    if (user?.current_group_id) {
      setCurrentGroupId(user.current_group_id);
    }
  }, [user]);

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

  if (!user || !user.groups || user.groups.length <= 1) {
    return null; // Don't show selector if user has 0 or 1 groups
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
