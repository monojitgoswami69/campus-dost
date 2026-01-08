import React, { useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import WelcomeScreen from './WelcomeScreen';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

function ChatMessages() {
    const { messages, welcomeDismissed, isTyping } = useChat();
    const messagesContainerRef = useRef(null);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const scrollToBottomIfAtBottom = () => {
        if (messagesContainerRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
            const isAtBottom = (scrollHeight - scrollTop - clientHeight) < 50;
            if (isAtBottom) {
                scrollToBottom();
            }
        }
    };

    useEffect(() => {
        scrollToBottomIfAtBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        if (welcomeDismissed) {
            scrollToBottom();
        }
    }, [welcomeDismissed]);

    return (
        <main className="chat-messages" ref={messagesContainerRef}>
            {!welcomeDismissed && <WelcomeScreen />}
            
            {messages.map((message) => (
                <Message key={message.id} message={message} />
            ))}
            
            {isTyping && <TypingIndicator />}
        </main>
    );
}

export default ChatMessages;
