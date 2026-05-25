"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Globe, Rocket, CheckCircle2 } from "lucide-react";

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
      toast.error(err.message || t('auth.loginError'));
    }
  }

  const steps = [
    { text: "Conecta tu WhatsApp Business", done: false },
    { text: "Redacta tu mensaje", done: false },
    { text: "Envía campañas masivas", done: false },
    { text: "Llega a tus clientes", done: false },
    { text: "Sin bloqueos", done: true },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-3 relative">
      {/* Language toggle */}
      <div className="fixed top-4 right-4 z-20">
        <button
          type="button"
          onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-xs font-normal tracking-normal text-slate-600 dark:text-slate-400"
        >
          <Globe className="h-3.5 w-3.5" />
          {locale === 'es' ? 'English' : 'Español'}
        </button>
      </div>

      {/* Left Column — Inspirational / Educational */}
      <div className="hidden lg:flex flex-col items-center justify-center gap-5 px-8 xl:px-12 py-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-5 max-w-sm">
          {/* Rocket illustration */}
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shadow-sm">
              <Rocket className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-2xl xl:text-3xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white leading-tight">
              Llega a tus clientes<br />
              <span className="text-emerald-600">sin bloqueos</span>
            </h1>
            <p className="text-xs font-normal tracking-normal text-slate-500 dark:text-slate-400">
              Somos la única plataforma oficial de WhatsApp Business en Latinoamérica
            </p>
          </div>

          {/* Steps */}
          <div className="w-full space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  step.done
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700"
                )}>
                  {step.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[11px] font-normal tracking-normal text-slate-500 dark:text-slate-300">{i + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium tracking-[-0.02em]",
                  step.done
                    ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400"
                )}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl p-3.5 border border-emerald-100/50 dark:border-emerald-900/20 w-full">
            <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
              &ldquo;La mensajería oficial es la única forma de escalar sin miedo a ser baneado&rdquo;
            </p>
            <p className="text-[11px] font-normal tracking-normal text-slate-600 dark:text-slate-300 mt-1.5">
              — Ángel Avendaño, Founder
            </p>
          </div>
        </div>
      </div>

      {/* Center Column — Form (centered) */}
      <div className="flex items-center justify-center p-4 md:p-6 lg:col-span-1">
        <div className="w-full max-w-sm space-y-4">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-4">
            <Image src="/logo.png" alt="CallMesd" width={48} height={48} className="rounded-full shadow-lg" />
            <h1 className="text-lg font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">CallMesd</h1>
          </div>

          {/* Mobile steps (simplified) */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-3">
            {steps.map((step, i) => (
              <div key={i} className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step.done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
              )} />
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] p-5 md:p-6 space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">
                {t('auth.welcomeBack')}
              </h2>
              <p className="text-xs font-normal tracking-normal text-slate-500 dark:text-slate-400">
                {t('auth.enterCredentials')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal tracking-normal text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="demo@clicksend.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-normal tracking-normal text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:shadow-[0_0_0_1px_rgba(16,185,129,0.5)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal tracking-normal text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] rounded-xl pl-9 pr-10 py-2.5 text-sm font-normal tracking-normal text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:shadow-[0_0_0_1px_rgba(16,185,129,0.5)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-[11px] font-medium tracking-normal text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                >
                  {t('auth.forgotPassword') || "¿Olvidaste tu contraseña?"}
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium py-2.5 rounded-xl text-sm tracking-normal transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Rocket className="h-3.5 w-3.5" />
                    COMENZAR
                  </>
                )}
              </button>

              {/* Register link */}
              <p className="text-center text-xs font-normal tracking-normal text-slate-500 dark:text-slate-400">
                {t('auth.noAccount')}{" "}
                <Link href="/auth/register" className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                  {t('auth.registerHere')}
                </Link>
              </p>
            </form>
          </div>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/privacy-policy" className="text-[11px] font-normal tracking-normal text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {t('nav.privacyPolicy')}
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link href="/terms-of-service" className="text-[11px] font-normal tracking-normal text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {t('nav.termsOfService')}
            </Link>
          </div>

        </div>
      </div>

      {/* Right Column — Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-xs">
          <div className="w-full max-w-[280px]">
            <Image
              src="/illustrations/person-computer.svg"
              alt="Persona trabajando en su computadora con WhatsApp Business"
              width={400}
              height={400}
              className="w-full h-auto"
              priority
            />
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-medium tracking-[-0.02em] text-emerald-700 dark:text-emerald-400">
              Gestiona tus campañas desde un solo lugar
            </p>
            <p className="text-[11px] font-normal tracking-normal text-slate-500 dark:text-slate-400">
              Plataforma oficial de WhatsApp Business API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
