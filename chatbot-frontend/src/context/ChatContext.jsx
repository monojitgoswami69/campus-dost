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
            selectOrganization
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
