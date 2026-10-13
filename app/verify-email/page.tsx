"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

type VerificationState = "verifying" | "invalid" | "retry";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [state, setState] = useState<VerificationState>("verifying");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("invalid");
      return;
    }

    const verify = async () => {
      setState("verifying");

      try {
        const response = await fetch("/api/auth/email", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });

        if (response.ok) {
          router.replace("/email-confirmed");
          return;
        }

        setState(response.status < 500 ? "invalid" : "retry");
      } catch {
        setState("retry");
      }
    };

    void verify();
  }, [attempt, params, router]);

  const retry = () => {
    setAttempt((value) => value + 1);
  };

  return (
    <div className="min-h-dvh finance-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.emailVerificationTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {state === "verifying"
              ? t("auth.verifyingEmail")
              : state === "invalid"
              ? t("auth.emailVerificationInvalidOrExpired")
              : t("auth.emailVerificationFailed")}
          </p>
          {state === "retry" && (
            <Button type="button" variant="outline" onClick={retry}>
              {t("common.retry")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
