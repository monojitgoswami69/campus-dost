import React, { useEffect, useRef } from 'react';

function TypingIndicator({ isHiding }) {
    const indicatorRef = useRef(null);

    useEffect(() => {
        if (indicatorRef.current) {
            requestAnimationFrame(() => {
                indicatorRef.current?.classList.add('message-enter');
            });
        }
    }, []);

    return (
        <div 
            ref={indicatorRef}
            className={`message bot typing-indicator-container ${isHiding ? 'is-hiding' : ''}`}
        >
            <div className="message-wrapper">
                <div className="message-content">
                    <div className="typing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TypingIndicator;
