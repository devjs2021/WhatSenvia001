"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Send, Globe, User, Building2, UserPlus } from "lucide-react";

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

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-[-80px] left-[-80px] h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] right-[-60px] h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 text-center text-white space-y-6">
          <Image src="/logo.png" alt="CallMesd" width={120} height={120} className="rounded-full mx-auto shadow-2xl border-4 border-white/30" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">CallMesd</h1>
            <p className="text-blue-100 mt-2 text-lg">{t('auth.smartSolution')}</p>
          </div>
          <div className="space-y-3 pt-4">
            {[
              { icon: Send, text: t('auth.feature1') },
              { icon: Mail, text: t('auth.feature2') },
              { icon: Lock, text: t('auth.feature3') },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-blue-50">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8 relative">
        {/* Selector de idioma superior */}
        <div className="absolute top-8 right-8">
          <button
            type="button"
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all text-xs font-semibold text-gray-600 dark:text-gray-400"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'es' ? 'English' : 'Español'}
          </button>
        </div>

        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            <Image src="/logo.png" alt="CallMesd" width={72} height={72} className="rounded-full shadow-lg" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CallMesd</h1>
          </div>

          {/* Encabezado */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.welcomeBack')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.enterCredentials')}</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-200 dark:shadow-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t('auth.login')}
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-1">
              {t('auth.noAccount')}{" "}
              <Link href="/auth/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                {t('auth.registerHere')}
              </Link>
            </p>
          </form>

          {/* Footer links */}
          <div className="pt-8 border-t border-gray-100 dark:border-gray-900 flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {t('nav.privacyPolicy')}
              </Link>
              <Link href="/terms-of-service" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {t('nav.termsOfService')}
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
