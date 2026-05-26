"use client";

import Link from "next/link";
import { Shield, Lock, Eye, Trash2, Mail, FileText, ChevronLeft, Globe } from "lucide-react";
import { useI18n } from "@/i18n";

export default function PrivacyPolicyPage() {
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
              {t('privacy.backToLogin')}
            </Link>

            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-xs font-semibold text-slate-500"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === 'es' ? 'English' : 'Español'}
            </button>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">{t('privacy.title')}</h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            {t('privacy.intro')}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-50 w-fit px-4 py-2 rounded-full border border-slate-100">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t('privacy.lastUpdate')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 md:p-12 space-y-12">

          {/* Sección 1: Recopilación */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Eye className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('privacy.section1Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('privacy.section1Intro')}
            </p>
            <ul className="grid md:grid-cols-2 gap-4 mt-4">
              <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold block text-slate-900 mb-1">{t('privacy.dataAccountTitle')}</span>
                <span className="text-slate-500 text-sm">{t('privacy.dataAccountDesc')}</span>
              </li>
              <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold block text-slate-900 mb-1">{t('privacy.dataWhatsappTitle')}</span>
                <span className="text-slate-500 text-sm">{t('privacy.dataWhatsappDesc')}</span>
              </li>
              <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold block text-slate-900 mb-1">{t('privacy.dataContactsTitle')}</span>
                <span className="text-slate-500 text-sm">{t('privacy.dataContactsDesc')}</span>
              </li>
              <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold block text-slate-900 mb-1">{t('privacy.dataActivityTitle')}</span>
                <span className="text-slate-500 text-sm">{t('privacy.dataActivityDesc')}</span>
              </li>
            </ul>
          </section>

          {/* Sección 2: Uso */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('privacy.section2Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
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
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-500">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 3: Seguridad */}
          <section className="space-y-4 border-t border-slate-100 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('privacy.section3Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('privacy.section3Desc')}
              <br /><br />
              <strong className="text-slate-900">{t('privacy.importantNote')}</strong>
            </p>
          </section>

          {/* Sección 4: Eliminación de Datos */}
          <section className="space-y-4 border-t border-slate-100 pt-10 bg-red-50 -mx-8 px-8 py-10 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{t('privacy.section4Title')}</h2>
            </div>
            <p className="text-slate-500 leading-relaxed">
              {t('privacy.section4Intro')}
            </p>
            <div className="space-y-4 mt-4">
              <p className="text-slate-600">
                {t('privacy.deleteDesc')}
              </p>
              <div className="bg-white p-6 rounded-2xl border border-red-100">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-red-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">{t('privacy.directContact')}</span>
                    <p className="text-slate-400 text-sm">
                      {t('privacy.contactDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 italic">
                {t('privacy.deletionNote')}
              </p>
            </div>
          </section>

          {/* Sección 5: Responsable y Contacto */}
          <section className="space-y-6 border-t border-slate-100 pt-10 text-center">
            <h2 className="font-display text-xl font-bold text-slate-900">{t('privacy.responsibleTitle')}</h2>
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <p className="font-semibold text-slate-900 text-lg">{t('privacy.responsibleName')}</p>
              <p>{t('privacy.address')}</p>
              <p>{t('privacy.phone')}</p>
              <p>{t('privacy.email')}</p>
            </div>
            <div className="pt-4">
              <a
                href="mailto:soporte@whatsenvia.com"
                className="inline-flex items-center justify-center px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-sm"
              >
                {t('privacy.contactSupport')}
              </a>
            </div>
          </section>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          {t('privacy.allRightsReserved')}
        </p>
      </div>
    </div>
  );
}
