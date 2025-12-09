"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

export function ChangeUsernameForm() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.error(t("settings.usernameRequired"));
      return;
    }
    if (newUsername === user?.username) {
      toast.error(t("settings.usernameUnchanged"));
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
        toast.success(t("settings.usernameUpdated"));
        await refreshUser();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || t("settings.failedToUpdateUsername"));
      }
    } catch {
      toast.error(t("settings.errorUpdatingUsername"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">
          {t("settings.newUsername")}
        </label>
        <Input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          required
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("settings.usernameCharacterLimit")}
        </p>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? t("settings.updating") : t("auth.changeUsername")}
      </Button>
    </form>
  );
}
