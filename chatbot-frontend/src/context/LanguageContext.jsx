import React, { createContext, useContext, useState, useCallback } from 'react';
import { LANGUAGES, TRANSLATIONS } from '../utils/constants';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [selectedLanguage, setSelectedLanguage] = useState('en');

    const getTranslations = useCallback(() => {
        return TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;
    }, [selectedLanguage]);

    const selectLanguage = useCallback((langCode) => {
        setSelectedLanguage(langCode);
    }, []);

    const getLanguageName = useCallback(() => {
        const lang = LANGUAGES.find(l => l.code === selectedLanguage);
        return lang ? lang.name : 'English';
    }, [selectedLanguage]);

    return (
        <LanguageContext.Provider value={{
            selectedLanguage,
            selectLanguage,
            getTranslations,
            getLanguageName,
            languages: LANGUAGES
        }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
