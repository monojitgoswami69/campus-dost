import React, { useState, useEffect } from 'react';

function Notification({ message, type = 'info', onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => {
            setIsVisible(true);
        });

        // Auto-hide after 5 seconds
        const hideTimeout = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => clearTimeout(hideTimeout);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose && onClose();
        }, 300);
    };

    return (
        <div className={`notification notification-${type} ${isVisible ? 'is-visible' : ''}`}>
            <div className="notification-content">
                <span className="notification-message">{message}</span>
                <button 
                    className="notification-close" 
                    aria-label="Close notification"
                    onClick={handleClose}
                >
                    &times;
                </button>
            </div>
        </div>
    );
}

export default Notification;
