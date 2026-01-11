import React from 'react';
import Header from './components/Header';
import ChatMessages from './components/ChatMessages';
import InputPane from './components/InputPane';
import OrgSetupModal from './components/OrgSetupModal';

function App() {
    return (
        <div className="chat-layout-wrapper">
            <div className="chatbot-container">
                <Header />
                <ChatMessages />
                <InputPane />
                <OrgSetupModal />
            </div>
        </div>
    );
}

export default App;
