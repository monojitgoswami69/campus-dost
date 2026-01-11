import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/HandoffModal.css';

function HandoffModal() {
    const { 
        showHandoffModal, 
        handoffData, 
        submitHandoffEmail, 
        skipHandoffEmail,
        handoffSubmitting 
    } = useChat();
    
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');

    if (!showHandoffModal || !handoffData) {
        return null;
    }

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setEmailError('Please enter your email address');
            return;
        }
        
        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address');
            return;
        }
        
        setEmailError('');
        submitHandoffEmail(email.trim());
        setEmail('');
    };

    const handleSkip = () => {
        skipHandoffEmail();
        setEmail('');
        setEmailError('');
    };

    return (
        <div className="handoff-overlay">
            <div className="handoff-modal">
                <div className="handoff-header">
                    <div className="handoff-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <h2>Expert Assistance Needed</h2>
                </div>
                
                <div className="handoff-content">
                    <p className="handoff-message">
                        Your question requires assistance from our support team to provide you with an accurate answer.
                    </p>
                    
                    <p className="handoff-prompt">
                        Would you like to receive the answer via email? Our team will respond as soon as possible.
                    </p>
                    
                    <form onSubmit={handleSubmit} className="handoff-form">
                        <div className="handoff-input-group">
                            <label htmlFor="handoff-email">Email Address</label>
                            <input
                                id="handoff-email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError('');
                                }}
                                placeholder="your.email@example.com"
                                className={emailError ? 'error' : ''}
                                disabled={handoffSubmitting}
                            />
                            {emailError && <span className="handoff-error">{emailError}</span>}
                        </div>
                        
                        <div className="handoff-actions">
                            <button 
                                type="submit" 
                                className="handoff-btn primary"
                                disabled={handoffSubmitting}
                            >
                                {handoffSubmitting ? (
                                    <>
                                        <span className="handoff-spinner"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13"/>
                                            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                                        </svg>
                                        Send me the answer
                                    </>
                                )}
                            </button>
                            
                            <button 
                                type="button" 
                                className="handoff-btn secondary"
                                onClick={handleSkip}
                                disabled={handoffSubmitting}
                            >
                                Skip for now
                            </button>
                        </div>
                    </form>
                    
                    <p className="handoff-note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                        </svg>
                        Your question has been logged and our team will review it.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default HandoffModal;
