import { useTranslation } from 'react-i18next';

const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'mr', label: 'मराठी' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'or', label: 'ଓଡ଼ିଆ' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'ur', label: 'اردو' },
    { code: 'ne', label: 'नेपाली' },
    { code: 'si', label: 'සිංහල' },
    { code: 'as', label: 'অসমীয়া' },
    { code: 'ma', label: 'मैथिली' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ru', label: 'Русский' },
    { code: 'zh', label: '中文' },
    { code: 'ar', label: 'العربية' },
];

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('lang', langCode);
    };

    return (
        <select
            value={i18n.language || 'en'}
            onChange={(e) => changeLanguage(e.target.value)}
            className="language-switcher"
        >
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
    );
}
