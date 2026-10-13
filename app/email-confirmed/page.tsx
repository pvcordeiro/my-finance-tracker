import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailConfirmedPage() {
  return (
    <main className="min-h-dvh finance-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email confirmed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your email is confirmed. You can close this tab.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
