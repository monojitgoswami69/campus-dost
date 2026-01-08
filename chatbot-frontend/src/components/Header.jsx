import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import avatarImg from '../assets/avatar.png';
import languageIcon from '../assets/language.svg';
import sunIcon from '../assets/sun.png';
import moonIcon from '../assets/moon.png';

function Header() {
    const { toggleTheme } = useTheme();
    const { getTranslations } = useLanguage();
    const themeBtnRef = useRef(null);

    const t = getTranslations();
    const titleParts = t.headerTitle.split(' ');

    const handleThemeToggle = () => {
        // Animate the button
        if (themeBtnRef.current) {
            themeBtnRef.current.style.animation = 'wiggle 0.5s ease-in-out';
            themeBtnRef.current.addEventListener('animationend', () => {
                if (themeBtnRef.current) {
                    themeBtnRef.current.style.animation = '';
                }
            }, { once: true });
        }
        toggleTheme();
    };

    return (
        <header className="chatbot-header">
            <div className="bot-profile">
                <img 
                    src={avatarImg} 
                    alt="Bot Avatar" 
                    className="bot-avatar" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="bot-title">
                    <span className="bot-name">
                        <span className="bot-name-line">{titleParts[0]}</span>
                        <span className="bot-name-line">{titleParts.slice(1).join(' ')}</span>
                    </span>
                </div>
            </div>
            <div className="header-controls">
                <LanguageSelector languageIcon={languageIcon} />
                <button 
                    className="icon-btn theme-btn" 
                    title="Toggle theme"
                    onClick={handleThemeToggle}
                    ref={themeBtnRef}
                >
                    <span className="sr-only">Toggle theme</span>
                    <img 
                        src={sunIcon} 
                        alt="Light Mode" 
                        className="icon sun-icon" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <img 
                        src={moonIcon} 
                        alt="Dark Mode" 
                        className="icon moon-icon" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </button>
            </div>
        </header>
    );
}

export default Header;
