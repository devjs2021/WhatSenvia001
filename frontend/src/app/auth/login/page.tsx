"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Send } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/contacts");
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-[-80px] left-[-80px] h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] right-[-60px] h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 text-center text-white space-y-6">
          <Image src="/logo.png" alt="What's Envia" width={120} height={120} className="rounded-full mx-auto shadow-2xl border-4 border-white/30" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">What's Envia</h1>
            <p className="text-green-100 mt-2 text-lg">Plataforma de Mensajería Masiva</p>
          </div>
          <div className="space-y-3 pt-4">
            {[
              { icon: Send, text: "Envíos masivos inteligentes" },
              { icon: Mail, text: "Gestión de contactos avanzada" },
              { icon: Lock, text: "Plataforma segura y confiable" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-green-50">
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
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            <Image src="/logo.png" alt="What's Envia" width={72} height={72} className="rounded-full shadow-lg" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">What's Envia</h1>
          </div>

          {/* Encabezado */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bienvenido de vuelta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
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
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md shadow-green-200 dark:shadow-green-900/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </button>

            {/* Registro */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-1">
              ¿No tienes cuenta?{" "}
              <Link href="/auth/register" className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}
