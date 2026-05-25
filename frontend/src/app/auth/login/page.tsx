"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Globe } from "lucide-react";

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
    <div className="min-h-screen flex bg-[#f5f5f5] dark:bg-gray-950">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        {/* Language toggle */}
        <div className="absolute top-5 right-5">
          <button
            type="button"
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 hover:shadow-sm transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "es" ? "EN" : "ES"}
          </button>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile illustration */}
          <div className="lg:hidden flex justify-center">
            <Image
              src="/illustrations/login-hero.svg"
              alt="CallMesd"
              width={220}
              height={220}
              className="w-52 h-auto"
              priority
            />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("auth.welcomeBack")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("auth.enterCredentials")} <span className="font-semibold text-gray-700 dark:text-gray-300">CallMesd</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-transparent px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-transparent px-5 pr-12 py-3.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-gray-900 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold py-3.5 rounded-2xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("auth.login")
              )}
            </button>
          </form>

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
          <div className="flex items-center justify-center gap-3 pt-4">
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

      {/* Right — Illustration */}
      <div className="hidden lg:flex lg:w-[48%] relative items-center justify-center bg-[#f0faf0] dark:bg-emerald-950/20 rounded-l-[40px] overflow-hidden m-3 mr-3">
        <div className="relative z-10 flex flex-col items-center gap-6 px-10 max-w-md">
          {/* Illustration */}
          <div className="w-full max-w-[380px]">
            <Image
              src="/illustrations/login-hero.svg"
              alt="WhatsApp Business messaging"
              width={420}
              height={420}
              className="w-full h-auto"
              priority
            />
          </div>

          {/* Carousel dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="h-2 w-6 rounded-full bg-gray-900 dark:bg-white" />
          </div>

          {/* Text below illustration */}
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-snug">
              {t("auth.smartSolution")}
              <br />
              <span className="text-gray-800 dark:text-gray-100">
                con <span className="font-bold">CallMesd</span>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
