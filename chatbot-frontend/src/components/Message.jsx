import React, { useEffect, useRef } from 'react';
import { renderMarkdown } from '../utils/markdown';

function Message({ message }) {
    const messageRef = useRef(null);
    const { sender, text, isStreaming, isError, isSystem, isHandoff } = message;

    useEffect(() => {
        // Add enter animation after mount
        if (messageRef.current) {
            requestAnimationFrame(() => {
                messageRef.current?.classList.add('message-enter');
            });
        }
    }, []);

    const getContent = () => {
        if (sender === 'bot' || sender === 'system') {
            return { __html: renderMarkdown(text) };
        }
        return null;
    };

    // System messages (like org switch notifications)
    if (isSystem || sender === 'system') {
        return (
            <div 
                ref={messageRef}
                className="message system"
            >
                <div className="message-wrapper">
                    <div className="message-content system-message">
                        <div className="markdown-content">
                            {text}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Handoff messages (escalation notices)
    if (isHandoff) {
        return (
            <div 
                ref={messageRef}
                className="message bot handoff"
            >
                <div className="message-wrapper">
                    <div className="message-content handoff-message">
                        <div className="handoff-badge">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Connecting to Support</span>
                        </div>
                        <div className="markdown-content">
                            {text}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={messageRef}
            className={`message ${sender} ${isError ? 'error' : ''}`}
        >
            <div className="message-wrapper">
                <div className="message-content">
                    <div 
                        className="markdown-content"
                        dangerouslySetInnerHTML={sender === 'bot' ? getContent() : undefined}
                    >
                        {sender === 'user' ? text : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Message;
