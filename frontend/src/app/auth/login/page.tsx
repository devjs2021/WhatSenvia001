"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Globe, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/contacts");
    } catch (err: any) {
      toast.error(err.message || t("auth.loginError"));
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left — Illustration panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/20 overflow-hidden">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 flex flex-col items-center gap-8 px-12 max-w-md">
          {/* Illustration */}
          <div className="w-full max-w-[360px]">
            <Image
              src="/illustrations/login-hero.svg"
              alt="WhatsApp Business messaging"
              width={400}
              height={400}
              className="w-full h-auto drop-shadow-sm"
              priority
            />
          </div>

          {/* Text */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("auth.smartSolution")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
              Conecta, automatiza y envia mensajes masivos con la plataforma oficial de WhatsApp Business API
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[t("auth.feature1"), t("auth.feature2"), t("auth.feature3")].map(
              (feat) => (
                <span
                  key={feat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/50 border border-emerald-100 dark:border-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-400 shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {feat}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="CallMesd"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
              CallMesd
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "es" ? "EN" : "ES"}
          </button>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-8">
          <div className="w-full max-w-sm space-y-6">
            {/* Mobile illustration */}
            <div className="lg:hidden flex justify-center mb-2">
              <Image
                src="/illustrations/login-hero.svg"
                alt="WhatsApp Business"
                width={200}
                height={200}
                className="w-48 h-auto"
                priority
              />
            </div>

            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t("auth.welcomeBack")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("auth.enterCredentials")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 pl-10 pr-11 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-sm shadow-emerald-200 dark:shadow-emerald-900/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    {t("auth.login")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
            </div>

            {/* Register link */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t("auth.noAccount")}{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
              >
                {t("auth.registerHere")}
              </Link>
            </p>

            {/* Footer */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/privacy-policy"
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {t("nav.privacyPolicy")}
              </Link>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <Link
                href="/terms-of-service"
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {t("nav.termsOfService")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
