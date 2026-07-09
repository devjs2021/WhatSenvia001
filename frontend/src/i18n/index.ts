"use client";

import { create } from "zustand";
import esJson from "./es.json";
import enJson from "./en.json";
import { getStoredItem, setStoredItem } from "@/lib/safe-storage";

type Locale = "es" | "en";

function flatten(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

const translations: Record<Locale, Record<string, string>> = {
  es: flatten(esJson),
  en: flatten(enJson),
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: (getStoredItem("locale") as Locale) || "es",
  setLocale: (locale: Locale) => {
    setStoredItem("locale", locale);
    set({ locale });
  },
  t: (key: string, params?: Record<string, string | number>) => {
    const { locale } = get();
    let value = translations[locale]?.[key] || translations["en"]?.[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, String(v));
      }
    }
    return value;
  },
}));
