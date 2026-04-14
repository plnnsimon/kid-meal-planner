import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'uk', label: 'UK' },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

export function useLocale() {
  const { locale } = useI18n()

  const currentLocale = computed(() => locale.value as LocaleCode)

  function setLocale(code: LocaleCode) {
    locale.value = code
    localStorage.setItem('locale', code)
    document.documentElement.lang = code
  }

  return { currentLocale, setLocale, supportedLocales: SUPPORTED_LOCALES }
}
