import { useLanguage } from '../contexts/LanguageContext';

/**
 * Custom hook for using translations in components
 * Simplifies importing and using the t() function
 * 
 * Usage:
 * const { t } = useTranslation();
 * <h1>{t('home.title')}</h1>
 */
export const useTranslation = () => {
  const { t, currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  
  return {
    t,
    currentLanguage,
    changeLanguage,
    supportedLanguages
  };
};

export default useTranslation;
