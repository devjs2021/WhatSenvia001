import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import esTranslations from './es.json';
import enTranslations from './en.json';

type Translations = typeof esTranslations;

const translations: Record<string, Translations> = {
  es: esTranslations,
  en: enTranslations,
};

interface I18nState {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'es',
      setLocale: (locale) => set({locale}),
      t: (key, params) => {
        const localeData = translations[get().locale];
        const keys = key.split('.');
        let value: any = localeData;
        
        for (const k of keys) {
          value = value?.[k];
        }
        
        if (typeof value !== 'string') return key;
        
        if (params) {
          return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => 
            params[paramKey]?.toString() ?? ''
          );
        }
        
        return value;
      },
    }),
    {
      name: 'i18n-storage',
    }
  )
);

export const getLocale = () => {
  if (typeof window === 'undefined') return 'es';
  const stored = localStorage.getItem('i18n-storage');
  if (stored) {
    try {
      return JSON.parse(stored).state?.locale || 'es';
    } catch {
      return 'es';
    }
  }
  return 'es';
};

export const languages = [
  {code: 'es', name: 'Español'},
  {code: 'en', name: 'English'},
];