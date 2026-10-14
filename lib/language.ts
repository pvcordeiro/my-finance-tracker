export type AppLanguage = "en" | "pt";

export function languageFromLocale(locale?: string | null): AppLanguage {
  return /^pt(?:[-_]|$)/i.test(locale?.trim() ?? "") ? "pt" : "en";
}

export function languageFromAcceptLanguage(header?: string | null): AppLanguage {
  const preferredLocale = header?.split(",")[0]?.split(";")[0]?.trim();
  return languageFromLocale(preferredLocale);
}
