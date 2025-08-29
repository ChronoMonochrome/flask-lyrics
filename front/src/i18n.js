import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend'; // To load translation files

// The languages you want to support
const languages = ['en', 'ru']; // English and Russian

i18n
  .use(Backend) // Use the http backend to load translations
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    fallbackLng: 'en', // Fallback language if the detected language is not available
    lng: 'en', // Default language to use
    debug: false, // Set to true to see console logs for i18next (helpful for debugging)

    // Where to find the translation files.
    // '{{lng}}' will be replaced by the current language code (e.g., 'en', 'ru').
    // '{{ns}}' will be replaced by the namespace (e.g., 'translation' which is default).
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Optional: Configure namespaces if you want to split translations into multiple files
    // ns: ['common', 'auth'], // Example namespaces
    // defaultNS: 'common', // Default namespace
  });

export default i18n;
