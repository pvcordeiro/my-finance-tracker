"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

export function EmailRecoverySettings() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [canceling, setCanceling] = useState(false);

  const refresh = async () => {
    try {
      const response = await fetch("/api/auth/email", { credentials: "include", cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        setEmail(result.pendingEmail || result.email || "");
        setVerified(Boolean(result.verified));
        setNotice(result.pendingEmail ? t("auth.pendingVerificationNotice") : "");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const sendVerification = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("common.error"));
      setNotice((current) => current || t("auth.pendingVerificationNotice"));
      await refresh();
      toast.success(t("auth.verificationSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally { setSending(false); }
  };

  const cancelChange = async () => {
    setCanceling(true);
    try {
      const response = await fetch("/api/auth/email", { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(t("common.error"));
      setNotice("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally { setCanceling(false); }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t("auth.changeRecoveryEmail")}</p>
        <Label htmlFor="recovery-email">{t("auth.email")}</Label>
        <Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setVerified(false); }} disabled={loading} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={loading || sending || !email} onClick={sendVerification}>
          {sending ? t("common.loading") : verified && !notice ? t("auth.resendVerification") : t("auth.verifyEmail")}
        </Button>
        <span className={`text-sm ${verified && !notice ? "text-finance-positive" : "text-muted-foreground"}`}>
          {verified && !notice ? t("auth.emailVerified") : t("auth.emailNotVerified")}
        </span>
        {notice && <Button type="button" variant="ghost" disabled={canceling} onClick={cancelChange}>{canceling ? t("common.loading") : t("auth.cancelEmailChange")}</Button>}
      </div>
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  );
}
