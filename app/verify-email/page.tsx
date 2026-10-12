"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function VerifyEmailContent() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying your email address…");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setMessage("This verification link is invalid or expired."); return; }
    fetch(`/api/auth/email?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.valid) throw new Error(data.error || "This verification link is invalid or expired.");
        const verify = await fetch("/api/auth/email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        const result = await verify.json();
        if (!verify.ok) throw new Error(result.error || "This verification link is invalid or expired.");
        setMessage("Your email is verified. You can now use it to reset your password.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "We could not verify your email. Please try again."))
  }, [params]);
  return <div className="min-h-dvh finance-gradient flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Email verification</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{message}</p><Button asChild variant="outline"><Link href="/user">Account settings</Link></Button></CardContent></Card></div>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><VerifyEmailContent /></Suspense>;
}
