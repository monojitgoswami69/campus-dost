// Language definitions
export const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'raj', name: 'Rajasthani', native: 'राजस्थानी' },
    { code: 'hr', name: 'Haryanvi', native: 'हरियाणवी' }
];

// Translation definitions
export const TRANSLATIONS = {
    en: {
        headerTitle: "Campus Dost",
        welcomeTitle: "Welcome to Campus Dost",
        welcomeDesc: "How may I help you today?",
        inputPlaceholder: "Ask me anything...",
        suggestions: {
            whoAreYou: "Who are you?",
            whoMaintains: "Who maintains you?",
            whatCanYouDo: "What can you do?"
        }
    },
    hi: {
        headerTitle: "शिक्षा साथी",
        welcomeTitle: "शिक्षा साथी में आपका स्वागत है",
        welcomeDesc: "आज मैं आपकी क्या मदद कर सकता हूँ?",
        inputPlaceholder: "अपना प्रश्न लिखें...",
        suggestions: {
            whoAreYou: "आप कौन हैं?",
            whoMaintains: "आपको कौन संचालित करता है?",
            whatCanYouDo: "आप क्या कर सकते हैं?"
        }
    },
    bn: {
        headerTitle: "শিক্ষা সাথী",
        welcomeTitle: "শিক্ষা সাথীতে স্বাগতম",
        welcomeDesc: "আজ আমি আপনাকে কিভাবে সাহায্য করতে পারি?",
        inputPlaceholder: "আপনার প্রশ্ন লিখুন...",
        suggestions: {
            whoAreYou: "আপনি কে?",
            whoMaintains: "আপনাকে কে রক্ষণাবেক্ষণ করে?",
            whatCanYouDo: "আপনি কী করতে পারেন?"
        }
    },
    raj: {
        headerTitle: "शिक्षा साथी",
        welcomeTitle: "शिक्षा साथी में आपनो स्वागत है",
        welcomeDesc: "आज मैं थारी के मदद कर सकूँ?",
        inputPlaceholder: "आपनो सवाल लिखो...",
        suggestions: {
            whoAreYou: "थे कुण सो?",
            whoMaintains: "थमनै कुण चलावै?",
            whatCanYouDo: "थे के कर सको?"
        }
    },
    hr: {
        headerTitle: "शिक्षा साथी",
        welcomeTitle: "शिक्षा साथी में आपका स्वागत है",
        welcomeDesc: "आज मैं तेरी के मदद कर सकूँ?",
        inputPlaceholder: "अपना सवाल लिखो...",
        suggestions: {
            whoAreYou: "तू कौण सै?",
            whoMaintains: "तेरै न कौण चलावै सै?",
            whatCanYouDo: "तू के कर सकै सै?"
        }
    },
    ta: {
        headerTitle: "ஷிக்ஷா சாத்தி",
        welcomeTitle: "ஷிக்ஷா சாத்திக்கு வரவேற்கிறோம்",
        welcomeDesc: "இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        inputPlaceholder: "உங்கள் கேள்வியை டைப் செய்யுங்கள்...",
        suggestions: {
            whoAreYou: "நீங்கள் யார்?",
            whoMaintains: "உங்களை யார் பராமரிக்கிறார்கள்?",
            whatCanYouDo: "நீங்கள் என்ன செய்ய முடியும்?"
        }
    }
};

// Utility function to sanitize HTML
export function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('script, style, link, meta, [onclick], [onerror]').forEach(el => el.remove());
    return temp.innerHTML;
}

// Generate session ID
export function generateSessionId() {
    let sid = sessionStorage.getItem('campus_dost_sid');
    if (!sid) {
        sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('campus_dost_sid', sid);
    }
    return sid;
}

// Debounce function for performance
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Screen reader announcements
export function announceToScreenReader(message) {
    let announcement = document.getElementById('sr-announcement');
    if (!announcement) {
        announcement = document.createElement('div');
        announcement.id = 'sr-announcement';
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        document.body.appendChild(announcement);
    }
    announcement.textContent = `Bot says: ${message}`;
}
