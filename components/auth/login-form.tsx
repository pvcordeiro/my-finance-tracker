"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, UserPlus, LogIn, AlertTriangle, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { useLanguage } from "@/hooks/use-language";
import { FinanceLogo } from "@/components/ui/finance-logo";
import { LanguageFlag } from "@/components/ui/language-flag";
import { LanguageCurrencyDialog } from "@/components/ui/language-currency-dialog";

interface LoginFormProps {
  onLogin: (identifier: string, password: string) => Promise<boolean>;
  onRegister: (
    username: string,
    password: string,
    email: string,
    language: "en" | "pt",
    currency: import("@/lib/i18n").CurrencyCode
  ) => Promise<boolean>;
}

export function LoginForm({ onLogin, onRegister }: LoginFormProps) {
  const { t, currencySymbol, language, currency, setLanguage, setCurrency } =
    useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch("/api/auth/registration-status");
        if (response.ok) {
          const data = await response.json();
          setAllowRegistration(data.allowRegistration);
          setSmtpEnabled(data.smtpEnabled !== false);
        }
      } catch (error) {
        console.error("Failed to check registration status:", error);
        setAllowRegistration(true);
        setSmtpEnabled(true);
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError(t("auth.passwordTooShort"));
          setIsLoading(false);
          return;
        }
        try {
          const success = await onRegister(
            username,
            password,
            email,
            language,
            currency
          );
          if (success) {
            setSuccessMessage(
              smtpEnabled ? t("auth.checkEmailToVerify") : t("auth.accountCreated")
            );
            setIsRegisterMode(false);
            setPassword("");
            setConfirmPassword("");
          }
        } catch (registerError: unknown) {
          if (
            registerError &&
            typeof registerError === "object" &&
            "message" in registerError
          ) {
            setError(String((registerError as { message?: unknown }).message));
          } else {
            setError(t("auth.registrationFailed"));
          }
        }
      } else {
        const success = await onLogin(username, password);
        if (!success) {
          setError(t("auth.invalidCredentials"));
        }
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    if (!allowRegistration && !isRegisterMode) {
      setError(t("auth.registrationDisabled"));
      return;
    }
    setIsRegisterMode(!isRegisterMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-dvh finance-gradient flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setLanguageDialogOpen(true)}
        >
          <LanguageFlag language={language} />
          <span className="font-semibold">{currencySymbol}</span>
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        {!resetOpen && (
          <CardHeader className="text-center space-y-4">
            <FinanceLogo className="mx-auto h-12 w-12" />
            <div>
              <CardTitle className="text-2xl font-bold">
                {isRegisterMode ? t("auth.registerTitle") : t("auth.loginTitle")}
              </CardTitle>
              <CardDescription>
                {isRegisterMode
                  ? t("auth.registerDescription")
                  : t("auth.loginDescription")}
              </CardDescription>
            </div>
          </CardHeader>
        )}
        <CardContent className={resetOpen && smtpEnabled ? "pt-6" : undefined}>
          {resetOpen && smtpEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{resetSent ? t("auth.resetIfRegistered") : t("auth.resetDescription")}</p>
              {!resetSent && <div className="space-y-2"><Label htmlFor="reset-email">{t("auth.email")}</Label><Input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>}
              {!resetSent && <Button type="button" variant="default" className="w-full" disabled={!email || isLoading} onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), credentials: "include" });
                  if (!response.ok) throw new Error("Request failed");
                  setResetSent(true);
                } catch { setError(t("common.error")); }
                finally { setIsLoading(false); }
              }}>{isLoading ? t("common.loading") : t("auth.sendResetLink")}</Button>}
              <Button type="button" variant="outline" className="w-full" onClick={() => { setResetOpen(false); setResetSent(false); setError(""); }}>{t("auth.backToSignIn")}</Button>
            </div>
          ) : isRegisterMode && !allowRegistration ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t("auth.registrationDisabledMessage")}
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsRegisterMode(false)}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t("auth.backToSignIn")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegisterMode && smtpEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="register-email">{t("auth.email")}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("auth.enterEmail")}
                    required
                    autoComplete="email"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">
                  {isRegisterMode || !smtpEnabled
                    ? t("auth.username")
                    : t("auth.loginIdentifier")}
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    isRegisterMode || !smtpEnabled
                      ? t("auth.enterUsername")
                      : t("auth.enterLoginIdentifier")
                  }
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.enterPassword")}
                    required
                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              {isRegisterMode && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {t("auth.confirmPassword")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    required
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
              {successMessage && (
                <Alert className="border-finance-positive/40 bg-finance-positive/10 text-finance-positive" role="status">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full transition-all duration-200 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {isRegisterMode ? t("auth.creatingAccount") : t("auth.signingIn")}
                  </>
                ) : (
                  <>
                    {isRegisterMode ? (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t("auth.createAccount")}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        {t("auth.signIn")}
                      </>
                    )}
                  </>
                )}
              </Button>
              <div className="text-center">
                {!isRegisterMode && smtpEnabled && <Button type="button" variant="link" className="block mx-auto text-sm" onClick={() => setResetOpen(true)}>{t("auth.forgotPassword")}</Button>}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleMode}
                  className="text-sm text-muted-foreground hover:text-primary-contrast"
                  disabled={checkingRegistration}
                >
                  {checkingRegistration
                    ? t("common.loading")
                    : isRegisterMode
                    ? t("auth.alreadyHaveAccount")
                    : allowRegistration
                    ? t("auth.dontHaveAccount")
                    : t("auth.needAccount")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Language/Currency Dialog */}
      <LanguageCurrencyDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
        language={language}
        currency={currency}
        onLanguageChange={setLanguage}
        onCurrencyChange={setCurrency}
        continueLabel={t("common.confirm")}
        onContinue={() => setLanguageDialogOpen(false)}
        hideCloseButton
        t={t}
      />
    </div>
  );
}
