import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './styles/main.css';
import './styles/components.css';
import './styles/animations.css';

// Viewport height fix for mobile devices
function setVhProperty() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setVhProperty();
window.addEventListener('resize', setVhProperty);
window.addEventListener('orientationchange', () => {
    setTimeout(setVhProperty, 100);
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <LanguageProvider>
                <ChatProvider>
                    <App />
                </ChatProvider>
            </LanguageProvider>
        </ThemeProvider>
    </React.StrictMode>
);
