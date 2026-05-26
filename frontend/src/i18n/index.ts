"use client";

import { create } from "zustand";

type Locale = "es" | "en";

const translations: Record<Locale, Record<string, string>> = {
  es: {
    "nav.privacyPolicy": "Política de Privacidad",
    "nav.termsOfService": "Términos del Servicio",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.passwordPlaceholder": "••••••••",
    "auth.passwordMinChars": "Mínimo 8 caracteres",
    "auth.name": "Nombre completo",
    "auth.namePlaceholder": "Juan Pérez",
    "auth.company": "Empresa",
    "auth.companyPlaceholder": "Tu empresa (opcional)",
    "auth.login": "Iniciar sesión",
    "auth.loginError": "Error al iniciar sesión",
    "auth.registerError": "Error al registrarse",
    "auth.noAccount": "¿No tienes cuenta?",
    "auth.registerHere": "Regístrate aquí",
    "auth.hasAccount": "¿Ya tienes cuenta?",
    "auth.loginHere": "Inicia sesión aquí",
    "common.loading": "Cargando...",
  },
  en: {
    "nav.privacyPolicy": "Privacy Policy",
    "nav.termsOfService": "Terms of Service",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "••••••••",
    "auth.passwordMinChars": "Min 8 characters",
    "auth.name": "Full name",
    "auth.namePlaceholder": "John Doe",
    "auth.company": "Company",
    "auth.companyPlaceholder": "Your company (optional)",
    "auth.login": "Sign in",
    "auth.loginError": "Login error",
    "auth.registerError": "Registration error",
    "auth.noAccount": "Don't have an account?",
    "auth.registerHere": "Register here",
    "auth.hasAccount": "Already have an account?",
    "auth.loginHere": "Login here",
    "common.loading": "Loading...",
  },
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: (typeof window !== "undefined" && (localStorage.getItem("locale") as Locale)) || "es",
  setLocale: (locale: Locale) => {
    localStorage.setItem("locale", locale);
    set({ locale });
  },
  t: (key: string) => {
    const { locale } = get();
    return translations[locale]?.[key] || translations["en"]?.[key] || key;
  },
}));
