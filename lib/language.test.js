import { describe, expect, test } from "bun:test";
import { languageFromAcceptLanguage, languageFromLocale } from "./language.ts";

describe("browser language defaults", () => {
  test("recognizes Portuguese locale variants", () => {
    for (const locale of ["pt", "pt-BR", "pt-PT", "PT_ao"]) {
      expect(languageFromLocale(locale)).toBe("pt");
    }
  });

  test("uses English for other and missing locales", () => {
    expect(languageFromLocale("en-US")).toBe("en");
    expect(languageFromLocale("es-PT")).toBe("en");
    expect(languageFromLocale(null)).toBe("en");
  });

  test("uses the preferred Accept-Language locale", () => {
    expect(languageFromAcceptLanguage("pt-PT,pt;q=0.9,en-US;q=0.8")).toBe("pt");
    expect(languageFromAcceptLanguage("en-US,en;q=0.9,pt-BR;q=0.7")).toBe("en");
  });
});
