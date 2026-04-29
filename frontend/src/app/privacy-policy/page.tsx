"use client";

import Link from "next/link";
import { Shield, Lock, Eye, Trash2, Mail, FileText, ChevronLeft, Globe } from "lucide-react";
import { useI18n } from "@/i18n";

export default function PrivacyPolicyPage() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* Header decorativo */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-50px] left-[-50px] h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center text-blue-100 hover:text-white transition-colors group"
            >
              <ChevronLeft className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" />
              {t('privacy.backToLogin')}
            </Link>

            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-medium"
            >
              <Globe className="h-4 w-4" />
              {locale === 'es' ? 'English' : 'Español'}
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{t('privacy.title')}</h1>
          <p className="text-blue-50 text-lg max-w-2xl opacity-90">
            {t('privacy.intro')}
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
            <Shield className="h-4 w-4 text-blue-300" />
            <span>{t('privacy.lastUpdate')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 -mt-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 md:p-12 space-y-12">
          
          {/* Sección 1: Recopilación */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('privacy.section1Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('privacy.section1Intro')}
            </p>
            <ul className="grid md:grid-cols-2 gap-4 mt-4">
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">{t('privacy.dataAccountTitle')}</span>
                {t('privacy.dataAccountDesc')}
              </li>
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">{t('privacy.dataWhatsappTitle')}</span>
                {t('privacy.dataWhatsappDesc')}
              </li>
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">{t('privacy.dataContactsTitle')}</span>
                {t('privacy.dataContactsDesc')}
              </li>
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">{t('privacy.dataActivityTitle')}</span>
                {t('privacy.dataActivityDesc')}
              </li>
            </ul>
          </section>

          {/* Sección 2: Uso */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('privacy.section2Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('privacy.section2Intro')}
            </p>
            <div className="grid gap-3">
              {[
                t('privacy.useItem1'),
                t('privacy.useItem2'),
                t('privacy.useItem3'),
                t('privacy.useItem4'),
                t('privacy.useItem5')
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 3: Seguridad */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('privacy.section3Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('privacy.section3Desc')}
              <br /><br />
              <strong className="text-gray-900 dark:text-white">{t('privacy.importantNote')}</strong>
            </p>
          </section>

          {/* Sección 4: Eliminación de Datos - REQUERIMIENTO FACEBOOK */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10 bg-red-50/50 dark:bg-red-900/10 -mx-8 px-8 py-10 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('privacy.section4Title')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('privacy.section4Intro')}
            </p>
            <div className="space-y-4 mt-4">
              <p className="text-gray-700 dark:text-gray-300">
                {t('privacy.deleteDesc')}
              </p>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <span className="block font-bold text-lg">{t('privacy.directContact')}</span>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('privacy.contactDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {t('privacy.deletionNote')}
              </p>
            </div>
          </section>

          {/* Sección 5: Responsable y Contacto */}
          <section className="space-y-6 border-t border-gray-100 dark:border-gray-800 pt-10 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('privacy.responsibleTitle')}</h2>
            <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
              <p className="font-semibold text-gray-900 dark:text-white text-lg">{t('privacy.responsibleName')}</p>
              <p>{t('privacy.address')}</p>
              <p>{t('privacy.phone')}</p>
              <p>{t('privacy.email')}</p>
            </div>
            <div className="pt-4">
              <a 
                href="mailto:soporte@whatsenvia.com" 
                className="inline-flex items-center justify-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all hover:scale-105"
              >
                {t('privacy.contactSupport')}
              </a>
            </div>
          </section>
        </div>
        
        <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
          {t('privacy.allRightsReserved')}
        </p>
      </div>
    </div>
  );
}
