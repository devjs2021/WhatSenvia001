"use client";

import Link from "next/link";
import { Shield, Lock, Eye, Trash2, Mail, FileText, ChevronLeft, Globe, Scale, AlertTriangle, Copyright } from "lucide-react";
import { useI18n } from "@/i18n";

export default function TermsOfServicePage() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* Header decorativo */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-50px] left-[-50px] h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center text-blue-100 hover:text-white transition-colors group"
            >
              <ChevronLeft className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" />
              {t('terms.backToLogin')}
            </Link>

            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-medium"
            >
              <Globe className="h-4 w-4" />
              {locale === 'es' ? 'English' : 'Español'}
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{t('terms.title')}</h1>
          <p className="text-blue-50 text-lg max-w-2xl opacity-90">
            {t('terms.intro')}
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
            <Scale className="h-4 w-4 text-blue-300" />
            <span>{t('terms.lastUpdate')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 -mt-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 md:p-12 space-y-12">
          
          {/* Sección 1: Introducción */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section1Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section1Desc')}
            </p>
          </section>

          {/* Sección 2: Descripción */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section2Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section2Desc')}
            </p>
          </section>

          {/* Sección 3: Registro */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section3Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section3Desc')}
            </p>
          </section>

          {/* Sección 4: Uso Aceptable */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section4Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
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
                  <span className="text-gray-600 dark:text-gray-400">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 5: Propiedad Intelectual */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Copyright className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section5Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section5Desc')}
            </p>
          </section>

          {/* Sección 6: Privacidad */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section6Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section6Desc')}
            </p>
          </section>

          {/* Sección 7: Limitación de Responsabilidad */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section7Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
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
                  <span className="text-gray-600 dark:text-gray-400">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-sm font-bold text-amber-800 dark:text-amber-400">
              {t('terms.liabilityNote')}
            </p>
          </section>

          {/* Sección 8: Modificaciones */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section8Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section8Desc')}
            </p>
          </section>

          {/* Sección 9: Ley Aplicable */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Scale className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('terms.section9Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('terms.section9Desc')}
            </p>
          </section>

          {/* Sección 10: Contacto */}
          <section className="space-y-6 border-t border-gray-100 dark:border-gray-800 pt-10 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('terms.section10Title')}</h2>
            <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t('terms.section10Desc')}</p>
              <p className="font-semibold text-gray-900 dark:text-white text-lg">animatrok@gmail.com</p>
            </div>
            <div className="pt-4">
              <a 
                href="mailto:animatrok@gmail.com" 
                className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all hover:scale-105"
              >
                {t('privacy.contactSupport')}
              </a>
            </div>
          </section>
        </div>
        
        <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
          {t('terms.allRightsReserved')}
        </p>
      </div>
    </div>
  );
}
