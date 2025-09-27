"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function ChangeUsernameForm() {
  const { user, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.error("Username is required");
      return;
    }
    if (newUsername === user?.username) {
      toast.error("Username is unchanged");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_username: newUsername.trim() }),
        credentials: "include",
      });
      if (response.ok) {
        toast.success("Username updated");
        await refreshUser();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to update username");
      }
    } catch (err) {
      toast.error("Error updating username");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">New Username</label>
        <Input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          required
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground mt-1">1-50 characters.</p>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating..." : "Change Username"}
      </Button>
    </form>
  );
}
