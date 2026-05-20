import { en, zh } from "../i18n";
import { Language, Translations } from "../type";

export function useTranslation(language: Language) {
  const translations: Translations = language === 'zh' ? zh : en;
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;
    for (const k of keys) {
      if (value[k] === undefined) return key;
      value = value[k];
    }
    if (typeof value !== 'string') return key;

    if (params) {
      return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
        return params[name] !== undefined ? String(params[name]) : `{{${name}}}`;
      });
    }
    return value;
  };
  return { t, language };
}