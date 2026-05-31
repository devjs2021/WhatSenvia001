"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MessageSquare,
  Shield,
  Bot,
  Zap,
  Check,
  ChevronDown,
  Star,
  Clock,
  ArrowRight,
} from "lucide-react";

const WA_NUMBER = "573138418314";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hola, vi tu página crmcontactsop.uk/clicksend. Quiero proteger mi WhatsApp")}`;

function trackWAClick() {
  try {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("trackCustom", "WAButtonClick", {
        content_name: "CTA WhatsApp ClickSend",
        content_category: "landing_clicksend",
      });
    }
  } catch {}
}

function WAButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackWAClick}
      className={`inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all active:scale-95 hover:shadow-lg hover:shadow-emerald-500/25 ${className}`}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      {children}
    </a>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-bold text-slate-900 pr-4">{question}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-sm text-slate-500 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function ClickSendLanding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ═══ HEADER ═══ */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-extrabold text-base text-slate-900 tracking-tight">
              Click<span className="text-emerald-600">Send</span>
            </span>
          </div>
          <WAButton className="text-[11px] px-3 py-1.5 rounded-xl">
            Escríbenos
          </WAButton>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-10 sm:pt-16 sm:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3 sm:mb-5">
              Pierdes clientes por responder tarde.{" "}
              <span className="text-emerald-600">Y tu WhatsApp puede desaparecer mañana.</span>
            </h1>
            <p className="text-sm sm:text-lg text-slate-500 mb-5 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              ClickSend resuelve los dos. API oficial de Meta, bot 24/7 y Click-to-WhatsApp — todo en uno.
            </p>

            {/* Banner */}
            <div className="mb-5 sm:mb-8">
              <img
                src="/banner-clicksend.png"
                alt="ClickSend — Verificado por Meta"
                className="w-full max-w-3xl mx-auto rounded-2xl sm:rounded-3xl shadow-lg shadow-emerald-100"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold mb-4 sm:mb-6">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              API Oficial de Meta
            </div>
            <div>
              <WAButton className="text-sm sm:text-lg px-6 py-3.5 sm:px-10 sm:py-5 w-full sm:w-auto">
                Escríbenos por WhatsApp — es gratis
              </WAButton>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Sin riesgo de baneo · 14 días gratis
            </p>
          </div>
        </div>
      </section>

      {/* ═══ DOLOR ═══ */}
      <section className="bg-slate-50 py-10 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 text-center mb-6 sm:mb-10">
            ¿Te suena familiar?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-red-100 p-5 sm:p-8">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-red-50 flex items-center justify-center mb-3 sm:mb-4">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 sm:mb-2">
                Respondes tarde y el cliente ya compró en otro lado
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                El 70% de las ventas por WhatsApp se pierden en la primera hora de contacto.
              </p>
            </div>
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-red-100 p-5 sm:p-8">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-red-50 flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 sm:mb-2">
                Usas WhatsApp sin API oficial y vives con miedo al baneo
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Una sola queja y tu cuenta desaparece sin aviso — y con ella, todos tus contactos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOLUCIÓN ═══ */}
      <section className="py-10 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 text-center mb-2 sm:mb-4">
            ClickSend lo resuelve sin complicaciones
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 text-center mb-6 sm:mb-12 max-w-lg mx-auto">
            Todo lo que necesitas para vender más por WhatsApp, protegido y automatizado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Bot,
                color: "bg-emerald-50 text-emerald-600",
                title: "Bot que atiende 24/7",
                desc: "Responde, califica y agenda sin que muevas un dedo.",
              },
              {
                icon: Shield,
                color: "bg-blue-50 text-blue-600",
                title: "Cuenta protegida con API oficial",
                desc: "La única integración aprobada por Meta. Cero riesgo de baneo.",
              },
              {
                icon: Zap,
                color: "bg-amber-50 text-amber-600",
                title: "Anuncios abren WhatsApp directo",
                desc: "Click-to-WhatsApp nativo. El lead toca y aterriza en tu WhatsApp.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-5 sm:p-8">
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl ${item.color} flex items-center justify-center mb-3 sm:mb-4`}>
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 sm:mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRECIOS ═══ */}
      <section className="bg-slate-50 py-10 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 text-center mb-6 sm:mb-10">
            Planes simples, sin sorpresas
          </h2>

          {/* Mobile: horizontal scroll / Desktop: grid */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 max-w-4xl sm:mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-8 flex flex-col min-w-[280px] sm:min-w-0 snap-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Starter</h3>
              <div className="mt-2 mb-4 sm:mt-3 sm:mb-5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">$29</span>
                <span className="text-xs sm:text-sm text-slate-400">/mes</span>
              </div>
              <ul className="space-y-2 mb-6 sm:mb-8 flex-1">
                {["1 número de WhatsApp", "Bot básico", "500 conversaciones/mes", "Plantillas HSM"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <WAButton className="text-xs sm:text-sm px-4 py-2.5 sm:py-3 w-full rounded-xl">
                Empezar
              </WAButton>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-emerald-500 p-5 sm:p-8 flex flex-col relative shadow-lg shadow-emerald-100 min-w-[280px] sm:min-w-0 snap-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-3 py-0.5 sm:px-4 sm:py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" />
                Más elegido
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Pro</h3>
              <div className="mt-2 mb-4 sm:mt-3 sm:mb-5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">$49</span>
                <span className="text-xs sm:text-sm text-slate-400">/mes</span>
              </div>
              <ul className="space-y-2 mb-6 sm:mb-8 flex-1">
                {["3 números de WhatsApp", "Bot con calificación", "2,000 conversaciones/mes", "Click-to-WhatsApp", "Analíticas"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <WAButton className="text-xs sm:text-sm px-4 py-2.5 sm:py-3 w-full rounded-xl">
                Empezar con Pro
              </WAButton>
            </div>

            {/* Business */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-8 flex flex-col min-w-[280px] sm:min-w-0 snap-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Business</h3>
              <div className="mt-2 mb-4 sm:mt-3 sm:mb-5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">$99</span>
                <span className="text-xs sm:text-sm text-slate-400">/mes</span>
              </div>
              <ul className="space-y-2 mb-6 sm:mb-8 flex-1">
                {["Números ilimitados", "Múltiples agentes", "10,000 conversaciones/mes", "Onboarding dedicado", "SLA garantizado"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <WAButton className="text-xs sm:text-sm px-4 py-2.5 sm:py-3 w-full rounded-xl">
                Empezar
              </WAButton>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-slate-500 px-2">
              <span className="font-bold text-emerald-600">Oferta:</span>{" "}
              14 días gratis + primer mes al 50% ($24.50) + configuración incluida.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ BANNER OFERTA ═══ */}
      <section className="py-10 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden">
            <div className="relative">
              <h2 className="text-xl sm:text-3xl font-extrabold text-white mb-5 sm:mb-8">
                Solo por tiempo limitado
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto mb-6 sm:mb-8 text-left">
                {[
                  "14 días gratis — sin tarjeta",
                  "Primer mes al 50% — $24.50",
                  "Configuración de 30 min incluida",
                  "Garantía de 30 días",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-emerald-50">{item}</span>
                  </div>
                ))}
              </div>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackWAClick}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold text-sm sm:text-lg px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl active:scale-95 hover:shadow-lg transition-all w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Quiero esta oferta — escríbenos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-slate-50 py-10 sm:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 text-center mb-6 sm:mb-10">
            Preguntas frecuentes
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <FAQItem
              question="¿Es realmente API oficial de Meta?"
              answer="Sí. Usamos Meta Cloud API — la única integración aprobada oficialmente por Meta para WhatsApp Business a escala. Tu cuenta cumple 100% sus políticas."
            />
            <FAQItem
              question="¿Qué pasa si ya uso WhatsApp Business normal?"
              answer="WhatsApp Business sin API puede ser baneado en cualquier momento sin aviso. Te migramos a la API oficial sin perder tu número ni tus contactos."
            />
            <FAQItem
              question="¿En cuánto tiempo lo tengo funcionando?"
              answer="En 30 minutos. Incluimos una sesión de configuración contigo donde dejamos el bot listo. Sin conocimientos técnicos necesarios."
            />
            <FAQItem
              question="¿Puedo cancelar cuando quiera?"
              answer="Sí. Sin contratos ni penalizaciones. Y tienes 30 días de garantía de devolución completa si no estás satisfecho."
            />
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="py-10 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-5 sm:mb-6">
            ¿Listo para dejar de perder clientes y proteger tu WhatsApp?
          </h2>
          <WAButton className="text-sm sm:text-lg px-6 py-3.5 sm:px-10 sm:py-5 w-full sm:w-auto">
            Escríbenos por WhatsApp — empezamos hoy
          </WAButton>
          <p className="text-[11px] text-slate-400 mt-3">
            Sin tarjeta de crédito · Configuración en 30 min · Garantía 30 días
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-100 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-[11px] text-slate-400">
            &copy; 2026 ClickSend ·{" "}
            <Link href="/privacy-policy" className="underline hover:text-slate-600">
              Política de Privacidad
            </Link>
          </p>
          <p className="text-[10px] text-slate-300 mt-1.5">
            ClickSend no es afiliado de Meta Platforms Inc. WhatsApp es marca registrada de Meta Platforms Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
