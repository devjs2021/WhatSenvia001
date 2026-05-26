"use client";

import Link from "next/link";
import { Shield, Lock, Eye, FileText, ChevronLeft, Globe, Scale, AlertTriangle, Copyright } from "lucide-react";
import { useI18n } from "@/i18n";

export default function TermsOfServicePage() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-slate-400 hover:text-emerald-600 transition-colors group text-sm font-semibold"
            >
              <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              {t('terms.backToLogin')}
            </Link>

            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-xs font-semibold text-slate-500"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === 'es' ? 'English' : 'Español'}
            </button>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">{t('terms.title')}</h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            {t('terms.intro')}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-50 w-fit px-4 py-2 rounded-full border border-slate-100">
            <Scale className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t('terms.lastUpdate')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 md:p-12 space-y-12">

          {/* Sección 1: Introducción */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section1Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section1Desc')}
            </p>
          </section>

          {/* Sección 2: Descripción */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section2Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section2Desc')}
            </p>
          </section>

          {/* Sección 3: Registro */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section3Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section3Desc')}
            </p>
          </section>

          {/* Sección 4: Uso Aceptable */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section4Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section4Intro')}
            </p>
            <div className="grid gap-3">
              {[
                t('terms.prohibition1'),
                t('terms.prohibition2'),
                t('terms.prohibition3'),
                t('terms.prohibition4'),
                t('terms.prohibition5')
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-slate-500">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 5: Propiedad Intelectual */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Copyright className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section5Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section5Desc')}
            </p>
          </section>

          {/* Sección 6: Privacidad */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Eye className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section6Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section6Desc')}
            </p>
          </section>

          {/* Sección 7: Limitación de Responsabilidad */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section7Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section7Intro')}
            </p>
            <div className="grid gap-3">
              {[
                t('terms.liability1'),
                t('terms.liability2'),
                t('terms.liability3')
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-500">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm font-bold text-amber-700">
              {t('terms.liabilityNote')}
            </p>
          </section>

          {/* Sección 8: Modificaciones */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section8Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section8Desc')}
            </p>
          </section>

          {/* Sección 9: Ley Aplicable */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Scale className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('terms.section9Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('terms.section9Desc')}
            </p>
          </section>

          {/* Sección 10: Contacto */}
          <section className="space-y-6 border-t border-slate-100 pt-10 text-center">
            <h2 className="font-display text-xl font-bold text-slate-900">{t('terms.section10Title')}</h2>
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <p className="text-slate-500 leading-relaxed">{t('terms.section10Desc')}</p>
              <p className="font-semibold text-slate-900 text-lg">animatrok@gmail.com</p>
            </div>
            <div className="pt-4">
              <a
                href="mailto:animatrok@gmail.com"
                className="inline-flex items-center justify-center px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-sm"
              >
                {t('privacy.contactSupport')}
              </a>
            </div>
          </section>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          {t('terms.allRightsReserved')}
        </p>
      </div>
    </div>
  );
}
