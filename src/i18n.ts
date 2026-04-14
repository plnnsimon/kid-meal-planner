import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import uk from '@/locales/uk'

export type MessageSchema = typeof en

export const i18n = createI18n<[MessageSchema], 'en' | 'uk'>({
  legacy: false,
  locale: (localStorage.getItem('locale') as 'en' | 'uk') ?? 'en',
  fallbackLocale: 'en',
  messages: { en, uk },
})
