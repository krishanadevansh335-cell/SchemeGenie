import { createContext, useContext, useEffect, useState } from 'react';
import allTranslations from '../translations/allTranslations.js';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState({});

  // Load translations when language changes
  useEffect(() => {
    // Ensure we have translations for the selected language, fallback to English
    const selectedTranslations = allTranslations[currentLanguage];
    if (selectedTranslations) {
      setTranslations(selectedTranslations);
    } else {
      console.warn(`Missing translations for language: ${currentLanguage}, falling back to English`);
      setTranslations(allTranslations['en']);
    }
  }, [currentLanguage]);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (language) => {
    setCurrentLanguage(language);
    localStorage.setItem('preferredLanguage', language);
  };

  const t = (key, fallback = key) => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Try fallback to English if key missing in current language
        let enValue = allTranslations['en'];
        for (const enK of keys) {
          if (enValue && typeof enValue === 'object' && enK in enValue) {
            enValue = enValue[enK];
          } else {
            return fallback;
          }
        }
        return typeof enValue === 'string' ? enValue : fallback;
      }
    }
    return typeof value === 'string' ? value : fallback;
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    translations,
    supportedLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
      { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
      { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
      { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
      { code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी' },
      { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
      { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी' },
      { code: 'sd', name: 'Sindhi', nativeName: 'सिंधी' },
      { code: 'mni', name: 'Manipuri', nativeName: 'মণিপুরী' },
      { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
      { code: 'brx', name: 'Bodo', nativeName: 'बड़ो' },
      { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
      { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृत' },
      { code: 'sat', name: 'Santali', nativeName: 'संताली' },
    ],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
