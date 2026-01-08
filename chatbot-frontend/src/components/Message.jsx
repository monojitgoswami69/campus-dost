import React, { useEffect, useRef } from 'react';
import { renderMarkdown } from '../utils/markdown';

function Message({ message }) {
    const messageRef = useRef(null);
    const { sender, text, isStreaming, isError } = message;

    useEffect(() => {
        // Add enter animation after mount
        if (messageRef.current) {
            requestAnimationFrame(() => {
                messageRef.current?.classList.add('message-enter');
            });
        }
    }, []);

    const getContent = () => {
        if (sender === 'bot') {
            return { __html: renderMarkdown(text) };
        }
        return null;
    };

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
