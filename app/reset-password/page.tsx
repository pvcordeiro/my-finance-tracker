"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.get("token"), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not reset your password.");
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not reset your password."); }
    finally { setLoading(false); }
  };

  return <div className="min-h-dvh finance-gradient flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Choose a new password</CardTitle></CardHeader><CardContent>{done ? <div className="space-y-4"><p className="text-sm text-muted-foreground">Your password was changed. Sign in again on your devices.</p><Button className="w-full" onClick={() => router.push("/login")}>Go to sign in</Button></div> : <form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required value={password} onChange={(e) => setPassword(e.target.value)} /><p className="text-xs text-muted-foreground">Use at least 8 characters.</p></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={loading}>{loading ? "Updating…" : "Reset password"}</Button></form>}</CardContent></Card></div>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordContent /></Suspense>;
}
