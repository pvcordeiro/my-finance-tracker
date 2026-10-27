"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";

export default function EmailConfirmedPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-dvh finance-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.emailConfirmed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("auth.emailConfirmedDescription")}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
