import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { generateSessionId, announceToScreenReader } from '../utils/constants';
import { renderMarkdown } from '../utils/markdown';

const ChatContext = createContext();

// Use environment variables with localhost defaults for development
const BACKEND_URL = import.meta.env.VITE_CHATBOT_BACKEND_URL || "http://localhost:8080";
const ADMIN_BACKEND_URL = import.meta.env.VITE_ADMIN_BACKEND_URL || "http://localhost:8000";

export function ChatProvider({ children }) {
    const [messages, setMessages] = useState([]);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    const [welcomeDismissed, setWelcomeDismissed] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [orgId, setOrgId] = useState(() => {
        // Load from localStorage or default to 'default'
        return localStorage.getItem('chatbot_org_id') || 'default';
    });
    const [showOrgSetup, setShowOrgSetup] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    
    // Handoff state
    const [showHandoffModal, setShowHandoffModal] = useState(false);
    const [handoffData, setHandoffData] = useState(null);
    const [handoffSubmitting, setHandoffSubmitting] = useState(false);
    
    const sessionIdRef = useRef(generateSessionId());

    // Start session on mount
    useEffect(() => {
        const startSession = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/session/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionIdRef.current })
                });
                
                if (!response.ok) {
                    console.error('Failed to start session');
                }
            } catch (error) {
                console.error('Error starting session:', error);
            }
        };

        startSession();
    }, []);

    const addMessage = useCallback((sender, text, options = {}) => {
        const id = Date.now() + Math.random();
        const newMessage = {
            id,
            sender,
            text,
            isStreaming: options.isStreaming || false,
            isError: options.isError || false
        };
        
        setMessages(prev => [...prev, newMessage]);
        return id;
    }, []);

    const updateMessage = useCallback((messageId, text) => {
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, text, isStreaming: false }
                : msg
        ));
    }, []);

    const dismissWelcome = useCallback(() => {
        return new Promise(resolve => {
            setWelcomeDismissed(true);
            setTimeout(resolve, 300);
        });
    }, []);

    const openOrgSetup = useCallback(async () => {
        // Fetch available organizations
        try {
            const response = await fetch(`${ADMIN_BACKEND_URL}/api/v1/organizations`);
            if (response.ok) {
                const data = await response.json();
                setOrganizations(data.organizations || []);
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
        }
        setShowOrgSetup(true);
    }, []);

    const closeOrgSetup = useCallback(() => {
        setShowOrgSetup(false);
    }, []);

    const selectOrganization = useCallback((selectedOrgId) => {
        setOrgId(selectedOrgId);
        localStorage.setItem('chatbot_org_id', selectedOrgId);
        setShowOrgSetup(false);
        
        // Add system message to chat
        addMessage('system', `Organization switched to: ${selectedOrgId.toUpperCase()}`, { isSystem: true });
    }, []);

    // Handoff email submission
    const submitHandoffEmail = useCallback(async (email) => {
        if (!handoffData) return;
        
        setHandoffSubmitting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/handoff/${handoffData.handoffId}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email,
                    org_id: orgId 
                })
            });
            
            if (response.ok) {
                // Add success message
                addMessage('system', `✓ We've recorded your email (${email}). Our team will get back to you soon!`, { isSystem: true });
            } else {
                addMessage('system', `Your question has been submitted. We'll respond to ${email} soon.`, { isSystem: true });
            }
        } catch (error) {
            console.error('Failed to submit email:', error);
            addMessage('system', `Your question has been logged. Our team will review it.`, { isSystem: true });
        } finally {
            setHandoffSubmitting(false);
            setShowHandoffModal(false);
            setHandoffData(null);
        }
    }, [handoffData, orgId, addMessage]);

    // Skip handoff email
    const skipHandoffEmail = useCallback(() => {
        addMessage('system', 'Your question has been logged. Our team will review it.', { isSystem: true });
        setShowHandoffModal(false);
        setHandoffData(null);
    }, [addMessage]);

    const sendMessage = useCallback(async (messageText) => {
        if (!messageText.trim() || isWaitingForResponse) return;

        // Check if message is the /setup command
        if (messageText.trim() === '/setup') {
            await openOrgSetup();
            return;
        }

        const proceed = async () => {
            setIsWaitingForResponse(true);
            
            // Add user message
            addMessage('user', messageText);
            
            // Show typing indicator
            setIsTyping(true);
            
            // Add bot message placeholder for streaming
            const botMessageId = addMessage('bot', '', { isStreaming: true });
            setStreamingMessageId(botMessageId);
            
            let fullReply = '';
            const charQueue = [];
            let rendererInterval = null;
            let handoffRequired = false;
            let handoffId = null;
            let confidence = 0;

            try {
                // Character renderer for typing effect
                rendererInterval = setInterval(() => {
                    if (charQueue.length > 0) {
                        const charsToAdd = charQueue.splice(0, 6).join('');
                        fullReply += charsToAdd;
                        setMessages(prev => prev.map(msg => 
                            msg.id === botMessageId 
                                ? { ...msg, text: fullReply }
                                : msg
                        ));
                    }
                }, 8);

                const response = await fetch(`${BACKEND_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: messageText,
                        session_id: sessionIdRef.current,
                        org_id: orgId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                // Check handoff headers
                handoffRequired = response.headers.get('X-Handoff-Required') === 'true';
                handoffId = response.headers.get('X-Handoff-Id');
                confidence = parseInt(response.headers.get('X-Confidence') || '0', 10);
                
                setIsTyping(false);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        // Wait for queue to empty
                        await new Promise(resolve => {
                            const finalCheck = setInterval(() => {
                                if (charQueue.length === 0) {
                                    clearInterval(rendererInterval);
                                    clearInterval(finalCheck);
                                    resolve();
                                }
                            }, 50);
                        });
                        
                        // Handle handoff - replace bot message with handoff message
                        if (handoffRequired && handoffId) {
                            // Update the bot message to show escalation notice
                            setMessages(prev => prev.map(msg => 
                                msg.id === botMessageId 
                                    ? { 
                                        ...msg, 
                                        text: "I'm not confident I can answer this question accurately. Let me connect you with our support team who can help you better.",
                                        isHandoff: true,
                                        isStreaming: false
                                    }
                                    : msg
                            ));
                            
                            // Show handoff modal for email collection
                            setHandoffData({
                                handoffId,
                                query: messageText,
                                confidence
                            });
                            setShowHandoffModal(true);
                        }
                        
                        setIsWaitingForResponse(false);
                        setStreamingMessageId(null);
                        announceToScreenReader(fullReply);
                        break;
                    }
                    const chunk = decoder.decode(value, { stream: true });
                    charQueue.push(...chunk.split(''));
                }

            } catch (error) {
                if (rendererInterval) clearInterval(rendererInterval);
                setIsTyping(false);
                const errorMessage = "Sorry, an error occurred. Please try again.";
                updateMessage(botMessageId, errorMessage);
                setIsWaitingForResponse(false);
                setStreamingMessageId(null);
                announceToScreenReader(errorMessage);
                console.error('Streaming failed:', error);
            }
        };

        if (!welcomeDismissed) {
            await dismissWelcome();
        }
        proceed();
    }, [isWaitingForResponse, welcomeDismissed, addMessage, updateMessage, dismissWelcome, orgId, openOrgSetup]);

    return (
        <ChatContext.Provider value={{
            messages,
            isWaitingForResponse,
            welcomeDismissed,
            isTyping,
            streamingMessageId,
            sendMessage,
            dismissWelcome,
            orgId,
            showOrgSetup,
            organizations,
            closeOrgSetup,
            selectOrganization,
            // Handoff state
            showHandoffModal,
            handoffData,
            handoffSubmitting,
            submitHandoffEmail,
            skipHandoffEmail
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
