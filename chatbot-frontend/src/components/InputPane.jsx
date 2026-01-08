import React, { useRef, useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';
import sendButtonIcon from '../assets/send_button.svg';

function InputPane() {
    const { sendMessage, isWaitingForResponse } = useChat();
    const { getTranslations } = useLanguage();
    const inputRef = useRef(null);
    const [hasText, setHasText] = useState(false);

    const t = getTranslations();

    const handleSendButtonState = () => {
        if (inputRef.current) {
            const text = inputRef.current.textContent.trim();
            setHasText(text.length > 0);
            
            // Clear content if empty to ensure placeholder shows
            if (!text) {
                inputRef.current.innerHTML = '';
            }
        }
    };

    const handleInputResize = () => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    };

    const handleSend = () => {
        if (inputRef.current) {
            const messageText = inputRef.current.textContent.trim();
            if (messageText && !isWaitingForResponse) {
                sendMessage(messageText);
                inputRef.current.textContent = '';
                setHasText(false);
                handleInputResize();
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape') {
            if (inputRef.current) {
                inputRef.current.textContent = '';
                handleSendButtonState();
            }
        }
    };

    const handleInput = () => {
        handleSendButtonState();
        handleInputResize();
    };

    const handlePaste = () => {
        setTimeout(handleSendButtonState, 0);
    };

    const handleFocus = () => {
        // Handle mobile keyboard
        const scrollAttempts = [150, 300, 500];
        scrollAttempts.forEach((delay) => {
            setTimeout(() => {
                // Scroll logic handled by parent if needed
            }, delay);
        });
    };

    const isDisabled = !hasText || isWaitingForResponse;

    return (
        <footer className="input-pane">
            <div className="input-wrapper">
                <div
                    ref={inputRef}
                    className="message-input"
                    contentEditable="true"
                    role="textbox"
                    aria-multiline="true"
                    data-placeholder={t.inputPlaceholder}
                    onKeyDown={handleKeyDown}
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onFocus={handleFocus}
                />
                <button 
                    className="send-btn" 
                    aria-label="Send message"
                    disabled={isDisabled}
                    onClick={handleSend}
                >
                    <img 
                        src={sendButtonIcon} 
                        alt="Send icon" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </button>
            </div>
        </footer>
    );
}

export default InputPane;
