import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { debounce } from '../utils/constants';

function LanguageSelector({ languageIcon }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { selectedLanguage, selectLanguage, getLanguageName, languages } = useLanguage();
    const selectorRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (selectorRef.current && !selectorRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const toggleDropdown = (e) => {
        e.stopPropagation();
        setIsOpen(prev => !prev);
    };

    const handleSelectLanguage = (langCode) => {
        selectLanguage(langCode);
        setIsOpen(false);
        setSearchTerm('');
    };

    const filteredLanguages = languages.filter(lang => 
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.native.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div 
            className={`language-selector ${isOpen ? 'open' : ''}`}
            ref={selectorRef}
        >
            <button 
                className="icon-btn language-btn"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls="languageDropdown"
                onClick={toggleDropdown}
            >
                <img 
                    src={languageIcon} 
                    alt="Language" 
                    className="icon" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span>{getLanguageName()}</span>
                <svg 
                    className="chevron" 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    fill="currentColor" 
                    viewBox="0 0 16 16"
                >
                    <path 
                        fillRule="evenodd" 
                        d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                    />
                </svg>
            </button>
            <div className="language-dropdown" id="languageDropdown" role="listbox">
                <div className="language-search-wrapper">
                    <input 
                        type="text" 
                        className="language-search"
                        placeholder="Search..."
                        aria-label="Search languages"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        ref={searchInputRef}
                    />
                </div>
                <ul className="language-options">
                    {filteredLanguages.map(lang => (
                        <li 
                            key={lang.code}
                            className="language-option"
                            data-lang={lang.code}
                            role="option"
                            tabIndex="-1"
                            aria-selected={lang.code === selectedLanguage}
                            onClick={() => handleSelectLanguage(lang.code)}
                        >
                            {lang.native}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default LanguageSelector;
