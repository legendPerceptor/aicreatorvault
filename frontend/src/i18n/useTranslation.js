import { useLanguage } from './LanguageContext';
import en from './translations/en.json';
import zh from './translations/zh.json';

const translations = { en, zh };

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function useTranslation() {
  const { language, toggleLanguage } = useLanguage();

  const t = (key, params) => {
    let value = getNestedValue(translations[language], key);
    if (value === undefined) {
      // Fallback to the other language
      value = getNestedValue(translations[language === 'zh' ? 'en' : 'zh'], key);
    }
    if (value === undefined) return key;

    // Simple interpolation: replace {param} with params[param]
    if (params) {
      Object.keys(params).forEach((param) => {
        value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
      });
    }

    return value;
  };

  return { t, language, toggleLanguage };
}
