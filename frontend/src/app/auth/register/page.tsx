"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Globe, ArrowRight, User, Lock, Mail, Building2, Clock } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, token, user, loadUser } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (token) {
      if (user) {
        router.replace("/dashboard");
      } else {
        loadUser().then(() => {
          if (useAuth.getState().user) router.replace("/dashboard");
        });
      }
    }
  }, [token, user, router, loadUser]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || t('auth.registerError'));
    }
  }

  function handleGoogleLogin() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error(
        locale === "es"
          ? "Google OAuth no está configurado. Contacta al administrador."
          : "Google OAuth is not configured. Contact the administrator."
      );
      return;
    }
    const redirectUri = window.location.origin + "/auth/google/callback";
    const scope = "openid email profile";
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=select_account`;
    window.location.href = authUrl;
  }

  return (
    <div
      className="bg-[#F8FAFC] min-h-screen flex items-center justify-center p-4 md:p-8 antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] w-full max-w-6xl p-6 md:p-12 flex flex-col gap-10 relative overflow-hidden">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span
              className="text-2xl font-extrabold tracking-tight text-slate-900"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              }}
            >
              Click<span className="text-emerald-600">Send</span>
            </span>
          </div>

          <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
            <Link
              href="/privacy-policy"
              className="hover:text-emerald-600 transition-colors"
            >
              {t("nav.privacyPolicy")}
            </Link>
            <Link
              href="/terms-of-service"
              className="hover:text-emerald-600 transition-colors"
            >
              {t("nav.termsOfService")}
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-3 text-slate-400">
            <button
              type="button"
              onClick={() => setLocale(locale === "es" ? "en" : "es")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-100 text-xs font-medium hover:text-slate-600 hover:border-slate-200 transition-all"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === "es" ? "EN" : "ES"}
            </button>
            <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center bg-slate-50">
              <User className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
            </div>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────── */}
        <main className="flex flex-col lg:flex-row lg:items-stretch items-center gap-8 lg:gap-12">
          {/* Left: Illustration */}
          <section className="w-full lg:w-[55%] relative overflow-hidden">
            <div className="absolute w-80 h-80 bg-emerald-100/50 rounded-full blur-3xl -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/illustrations/login-character.png"
                alt="ClickSend"
                width={700}
                height={700}
                className="h-[115%] w-auto max-w-none object-contain"
                quality={100}
                unoptimized
                priority
              />
            </div>
          </section>

          {/* Right: Form */}
          <section className="w-full lg:w-[45%] flex flex-col justify-center">
            {/* Phrase */}
            <div className="mb-8">
              <h1
                className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug"
                style={{
                  fontFamily:
                    '"Plus Jakarta Sans", system-ui, sans-serif',
                }}
              >
                {locale === "es" ? (
                  <>
                    Crea tu cuenta en{" "}
                    <span className="text-emerald-500">ClickSend</span>
                  </>
                ) : (
                  <>
                    Create your{" "}
                    <span className="text-emerald-500">ClickSend</span> account
                  </>
                )}
              </h1>
              <div className="mt-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500 select-none">
                  <svg
                    className="w-4 h-4 text-[#0064E0] fill-current"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16.4 6c-1.8 0-3.4 1-4.4 2.5C11 7 9.4 6 7.6 6 4.5 6 2 8.5 2 11.6s2.5 5.6 5.6 5.6c1.8 0 3.4-1 4.4-2.5 1 1.5 2.6 2.5 4.4 2.5 3.1 0 5.6-2.5 5.6-5.6S19.5 6 16.4 6zm-8.8 9.2c-2 0-3.6-1.6-3.6-3.6S5.6 8 7.6 8c1.3 0 2.5.7 3.1 1.8-.8 1.4-.8 3.2 0 4.6-.6 1.1-1.8 1.8-3.1 1.8zm8.8 0c-1.3 0-2.5-.7-3.1-1.8.8-1.4.8-3.2 0-4.6.6-1.1 1.8-1.8 3.1-1.8 2 0 3.6 1.6 3.6 3.6s-1.6 3.6-3.6 3.6z" />
                  </svg>
                  <span className="text-slate-600 font-bold text-[10px] tracking-wider uppercase">
                    {locale === "es"
                      ? "Verificados por Meta"
                      : "Verified by Meta"}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-w-[420px]"
            >
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("auth.name")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <User className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <input
                    type="text"
                    placeholder={t("auth.namePlaceholder")}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <input
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("auth.company")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Building2 className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <input
                    type="text"
                    placeholder={t("auth.companyPlaceholder")}
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordMinChars")}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-5 w-5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2 px-1 pt-1">
                <input
                  type="checkbox"
                  id="privacy"
                  required
                  className="h-4 w-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="privacy" className="text-xs text-slate-500">
                  {locale === "es" ? "Acepto los" : "I accept the"}{" "}
                  <Link href="/privacy-policy" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    {t("nav.privacyPolicy")}
                  </Link>
                  {" y "}
                  <Link href="/terms-of-service" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    {t("nav.termsOfService")}
                  </Link>
                </label>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-4 px-6 rounded-2xl shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    <>
                      <span>
                        {locale === "es"
                          ? "Crear cuenta gratuita"
                          : "Create free account"}
                      </span>
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-100" />
                <span className="flex-shrink mx-4 text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  {locale === "es" ? "O registrate con" : "Or sign up with"}
                </span>
                <div className="flex-grow border-t border-slate-100" />
              </div>

              {/* Social login */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex justify-center items-center gap-3 py-3.5 px-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm font-semibold text-slate-600">
                    {locale === "es" ? "Google" : "Google"}
                  </span>
                </button>
              </div>

              {/* Login link */}
              <div className="text-center pt-2">
                <p className="text-xs font-semibold text-slate-400">
                  {t("auth.hasAccount")}{" "}
                  <Link
                    href="/auth/login"
                    className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                  >
                    {t("auth.loginHere")}
                  </Link>
                </p>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
