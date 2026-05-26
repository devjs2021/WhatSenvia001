"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Eye, EyeOff, Globe, ArrowRight, User, Lock, Mail, Clock } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, token, user, loadUser } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "code" | "done">("email");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (token) {
      if (user) {
        router.replace("/contacts");
      } else {
        loadUser().then(() => {
          if (useAuth.getState().user) router.replace("/contacts");
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
      await login(form.email, form.password);
      router.push("/contacts");
    } catch (err: any) {
      toast.error(err.message || t("auth.loginError"));
    }
  }

  async function handleGoogleLogin() {
    // Use Google Identity Services
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error(
        locale === "es"
          ? "Google OAuth no está configurado. Contacta al administrador."
          : "Google OAuth is not configured. Contact the administrator."
      );
      return;
    }

    try {
      // Load Google Identity Services
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google script"));
        document.body.appendChild(script);
      });

      // Create a promise-based Google sign-in
      const credential = await new Promise<string>((resolve, reject) => {
        const google = (window as any).google;
        if (!google) {
          reject(new Error("Google SDK not loaded"));
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              resolve(response.credential);
            } else {
              reject(new Error("No credential received"));
            }
          },
          cancel_on_tap_outside: false,
        });

        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback: try rendering the button
            const container = document.createElement("div");
            container.style.display = "none";
            document.body.appendChild(container);
            google.accounts.id.renderButton(container, {
              type: "standard",
              theme: "outline",
              size: "large",
            });
            container.querySelector("div")?.click();
          }
        });
      });

      // Send credential to backend
      const res = await api.post<{
        user: any;
        token: string;
        refreshToken: string;
        isNewUser: boolean;
      }>("/auth/google", { credential });

      localStorage.setItem("token", res.token);
      localStorage.setItem("refreshToken", res.refreshToken);
      useAuth.setState({ user: res.user, token: res.token });

      if (res.isNewUser) {
        toast.success(
          locale === "es"
            ? "Cuenta creada exitosamente con Google"
            : "Account created successfully with Google"
        );
      }

      router.push("/contacts");
    } catch (err: any) {
      toast.error(err.message || "Google login failed");
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setIsSendingCode(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setResetStep("code");
      toast.success(
        locale === "es"
          ? "Si el email existe, recibirás un código"
          : "If the email exists, you'll receive a code"
      );
    } catch (err: any) {
      toast.error(err.message || "Error sending reset code");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setIsResetting(true);
    try {
      await api.post("/auth/reset-password", {
        email: forgotEmail,
        code: resetCode,
        password: newPassword,
      });
      setResetStep("done");
      toast.success(
        locale === "es"
          ? "Contraseña restablecida exitosamente"
          : "Password reset successfully"
      );
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetStep("email");
        setForgotEmail("");
        setResetCode("");
        setNewPassword("");
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Error resetting password");
    } finally {
      setIsResetting(false);
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
            {!showForgotPassword ? (
              <>
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
                        Inicia sesión en{" "}
                        <span className="text-emerald-500">ClickSend</span>
                      </>
                    ) : (
                      <>
                        Sign in to{" "}
                        <span className="text-emerald-500">ClickSend</span>
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
                        placeholder={t("auth.passwordPlaceholder")}
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
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

                  {/* Forgot password */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {locale === "es"
                        ? "¿Olvidaste tu contraseña?"
                        : "Forgot your password?"}
                    </button>
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
                          <span>{t("auth.login")}</span>
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
              </>
            ) : (
              <>
                {/* Forgot Password */}
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
                        Restablece tu{" "}
                        <span className="text-emerald-500">contraseña</span>
                      </>
                    ) : (
                      <>
                        Reset your{" "}
                        <span className="text-emerald-500">password</span>
                      </>
                    )}
                  </h1>
                  <p className="text-sm text-slate-500 mt-2">
                    {resetStep === "email" &&
                      (locale === "es"
                        ? "Ingresa tu email y te enviaremos un código de 6 dígitos"
                        : "Enter your email and we'll send you a 6-digit code")}
                    {resetStep === "code" &&
                      (locale === "es"
                        ? "Ingresa el código que recibiste y tu nueva contraseña"
                        : "Enter the code you received and your new password")}
                    {resetStep === "done" &&
                      (locale === "es"
                        ? "Contraseña restablecida. Redirigiendo..."
                        : "Password reset. Redirecting...")}
                  </p>
                </div>

                {resetStep === "email" && (
                  <form onSubmit={handleForgotPassword} className="space-y-4 max-w-[420px]">
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
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSendingCode}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-4 px-6 rounded-2xl shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSendingCode ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            {t("common.loading")}
                          </>
                        ) : (
                          <span>
                            {locale === "es"
                              ? "Enviar código"
                              : "Send code"}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {locale === "es" ? "Volver al inicio de sesión" : "Back to login"}
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === "code" && (
                  <form onSubmit={handleResetPassword} className="space-y-4 max-w-[420px]">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {locale === "es" ? "Código de 6 dígitos" : "6-digit code"}
                      </label>
                      <input
                        type="text"
                        placeholder="123456"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        maxLength={6}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-300 text-center text-2xl font-bold tracking-[8px] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {locale === "es" ? "Nueva contraseña" : "New password"}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                          <Lock className="h-5 w-5" strokeWidth={1.5} />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.passwordMinChars")}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isResetting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-4 px-6 rounded-2xl shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isResetting ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            {t("common.loading")}
                          </>
                        ) : (
                          <span>
                            {locale === "es"
                              ? "Restablecer contraseña"
                              : "Reset password"}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetStep("email");
                          setForgotEmail("");
                          setResetCode("");
                          setNewPassword("");
                        }}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {locale === "es" ? "Volver al inicio de sesión" : "Back to login"}
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === "done" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">
                      {locale === "es"
                        ? "Tu contraseña ha sido restablecida. Redirigiendo..."
                        : "Your password has been reset. Redirecting..."}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
