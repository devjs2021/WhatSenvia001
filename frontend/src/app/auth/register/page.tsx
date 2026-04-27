"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Building2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [showPassword, setShowPassword] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await register(form);
      router.push("/contacts");
    } catch (err: any) {
      toast.error(err.message || "Error al registrarse");
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-[-80px] left-[-80px] h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] right-[-60px] h-96 w-96 rounded-full bg-white/10" />
        <div className="relative z-10 text-center text-white space-y-6">
          <Image src="/logo.png" alt="What's Envia" width={120} height={120} className="rounded-full mx-auto shadow-2xl border-4 border-white/30" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">What's Envia</h1>
            <p className="text-green-100 mt-2 text-lg">Crea tu cuenta gratis</p>
          </div>
          <div className="space-y-3 pt-4">
            {["Envíos masivos sin límites", "Gestión avanzada de contactos", "Bots y automatizaciones"].map((text) => (
              <div key={text} className="flex items-center gap-3 text-green-50">
                <div className="h-2 w-2 rounded-full bg-white/70 shrink-0" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="w-full max-w-sm space-y-7">

          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            <Image src="/logo.png" alt="What's Envia" width={72} height={72} className="rounded-full shadow-lg" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">What's Envia</h1>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Crear cuenta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completa los datos para empezar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {[
              { field: "name", label: "Nombre completo", type: "text", placeholder: "Tu nombre", icon: User },
              { field: "email", label: "Correo electrónico", type: "email", placeholder: "tu@email.com", icon: Mail },
              { field: "company", label: "Empresa (opcional)", type: "text", placeholder: "Tu empresa", icon: Building2 },
            ].map(({ field, label, type, placeholder, icon: Icon }) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form as any)[field]}
                    onChange={(e) => update(field, e.target.value)}
                    required={field !== "company"}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md shadow-green-200 dark:shadow-green-900/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {isLoading ? (
                <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creando cuenta...</>
              ) : (
                <><UserPlus className="h-4 w-4" />Crear Cuenta</>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              ¿Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 transition-colors">
                Inicia sesión
              </Link>
            </p>
          </form>

          {/* Footer links */}
          <div className="pt-8 border-t border-gray-100 dark:border-gray-900 flex justify-center">
            <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
