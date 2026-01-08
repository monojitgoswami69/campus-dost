import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { generateSessionId, announceToScreenReader } from '../utils/constants';
import { renderMarkdown } from '../utils/markdown';

const ChatContext = createContext();

const BACKEND_URL = "https://campus-dost-backend.vercel.app";

export function ChatProvider({ children }) {
    const [messages, setMessages] = useState([]);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    const [welcomeDismissed, setWelcomeDismissed] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
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

    const sendMessage = useCallback(async (messageText) => {
        if (!messageText.trim() || isWaitingForResponse) return;

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
                        session_id: sessionIdRef.current
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
    }, [isWaitingForResponse, welcomeDismissed, addMessage, updateMessage, dismissWelcome]);

    return (
        <ChatContext.Provider value={{
            messages,
            isWaitingForResponse,
            welcomeDismissed,
            isTyping,
            streamingMessageId,
            sendMessage,
            dismissWelcome
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
