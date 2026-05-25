"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Globe, ArrowRight, User, Lock } from "lucide-react";

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
    <div
      className="bg-[#F8FAFC] min-h-screen flex items-center justify-center p-4 md:p-8 antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] w-full max-w-6xl p-6 md:p-12 flex flex-col gap-10 relative overflow-hidden">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="CallMesd"
              width={28}
              height={28}
              className="rounded-full"
            />
            <span
              className="text-2xl font-extrabold tracking-tight text-slate-900"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              }}
            >
              Call<span className="text-emerald-600">Mesd</span>
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
        <main className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Illustration */}
          <section className="w-full lg:w-[58%] flex justify-center items-center relative">
            <div className="absolute w-80 h-80 bg-emerald-100/50 rounded-full blur-3xl -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Image
              src="/illustrations/login-character.png"
              alt="CallMesd"
              width={700}
              height={700}
              className="w-full h-auto object-contain scale-[1.35] translate-y-[8%]"
              quality={100}
              unoptimized
              priority
            />
          </section>

          {/* Right: Form */}
          <section className="w-full lg:w-[42%] flex flex-col justify-center">
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
                    Entendemos el valor de tu{" "}
                    <span className="text-emerald-500">tiempo</span>, por eso
                    cuidamos de <span className="text-emerald-500">ti</span>.
                  </>
                ) : (
                  <>
                    We understand the value of your{" "}
                    <span className="text-emerald-500">time</span>, that&apos;s
                    why we take care of{" "}
                    <span className="text-emerald-500">you</span>.
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
              className="space-y-5 max-w-[420px]"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <User className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <input
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {t("auth.password")}
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                          ? "Iniciar Sesion de forma segura"
                          : "Sign in securely"}
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
                  {locale === "es" ? "O continua con" : "Or continue with"}
                </span>
                <div className="flex-grow border-t border-slate-100" />
              </div>

              {/* Social login */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      locale === "es"
                        ? "Proximamente"
                        : "Coming soon"
                    )
                  }
                  className="flex justify-center items-center py-3 px-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.444 1.244 15.618 0 12.24 0 5.581 0 0 5.37 0 12s5.581 12 12.24 12c6.96 0 11.57-4.84 11.57-11.72 0-.79-.085-1.4-.19-1.995H12.24z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      locale === "es"
                        ? "Proximamente"
                        : "Coming soon"
                    )
                  }
                  className="flex justify-center items-center py-3 px-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      locale === "es"
                        ? "Proximamente"
                        : "Coming soon"
                    )
                  }
                  className="flex justify-center items-center py-3 px-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z" />
                  </svg>
                </button>
              </div>

              {/* Register link */}
              <div className="text-center pt-2">
                <p className="text-xs font-semibold text-slate-400">
                  {t("auth.noAccount")}{" "}
                  <Link
                    href="/auth/register"
                    className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                  >
                    {t("auth.registerHere")}
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
