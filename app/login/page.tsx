"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

function LoginPageInner() {
  const { user, isLoading, login, register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      setShowSessionExpired(true);
      setTimeout(() => setShowSessionExpired(false), 2000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleLogin = async (username: string, password: string) => {
    const success = await login(username, password);
    if (success) {
      router.push("/");
    }
    return success;
  };

  const handleRegister = async (username: string, password: string) => {
    const success = await register(username, password);
    if (success) {
      router.push("/");
    }
    return success;
  };

  return (
    <>
      {showSessionExpired && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow z-50 pointer-events-none text-sm whitespace-nowrap">
          {t("auth.sessionExpired")}
        </div>
      )}
      <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
