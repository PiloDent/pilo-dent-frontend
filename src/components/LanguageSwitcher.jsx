import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const toggle = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de');
  };
  return (
    <button
      onClick={toggle}
      className="text-sm underline mb-4"
    >
      {i18n.language === 'de' ? 'Switch to English' : 'Wechsel zu Deutsch'}
    </button>
  );
}
