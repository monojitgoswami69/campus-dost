import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useChat } from '../context/ChatContext';
import avatarImg from '../assets/avatar.png';

function WelcomeScreen() {
    const { getTranslations } = useLanguage();
    const { sendMessage, welcomeDismissed } = useChat();
    
    const t = getTranslations();

    if (welcomeDismissed) {
        return null;
    }

    const handleSuggestionClick = (suggestion) => {
        sendMessage(suggestion);
    };

    const suggestions = Object.values(t.suggestions);

    return (
        <div className="welcome-message">
            <img 
                src={avatarImg} 
                alt="Campus Dost Avatar" 
                className="welcome-avatar" 
                onError={(e) => { e.target.style.display = 'none'; }}
            />
            <h2>{t.welcomeTitle}</h2>
            <p>{t.welcomeDesc}</p>
            <div className="welcome-suggestions">
                {suggestions.map((suggestion, index) => (
                    <button 
                        key={index}
                        className="suggestion-chip"
                        data-suggestion={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default WelcomeScreen;
