import React, { useState } from 'react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { SidebarMenu } from './SidebarMenu';
import { renderSidebarView } from './SidebarViews';
import { MOCK_CHATS, MOCK_MESSAGES, CURRENT_USER } from '../services/mockData';
import { ChatPreview, Message, ViewState } from '../types';

export const Layout: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<ChatPreview | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // New State for Left Sidebar View (Chats, Settings, etc.)
  const [currentView, setCurrentView] = useState<ViewState>('chats');

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: CURRENT_USER.id,
      content: text,
      timestamp: new Date(),
      type: 'text',
      status: 'sent',
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleMenuNavigation = (view: ViewState) => {
    setCurrentView(view);
    // If navigating to a non-chat view, strictly speaking we might want to deselect the chat on mobile
    // but keeping the chat open on desktop is fine.
  };

  const handleBackToChats = () => {
    setCurrentView('chats');
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans relative">
      
      {/* Sidebar Panel Container */}
      <div 
        className={`
          relative flex-col border-r border-gray-800 bg-[#0f172a] transition-all duration-300 ease-in-out z-20
          ${selectedChat ? 'hidden md:flex' : 'flex'}
          w-full md:w-[380px] lg:w-[420px]
        `}
      >
        <SidebarMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)}
          currentUser={CURRENT_USER}
          onNavigate={handleMenuNavigation}
          activeView={currentView}
        />

        {/* Conditional Rendering of Left Panel Content */}
        {currentView === 'chats' ? (
          <ChatList 
            chats={MOCK_CHATS} 
            activeChatId={selectedChat?.id}
            onSelectChat={setSelectedChat}
            onOpenMenu={() => setIsMenuOpen(true)}
          />
        ) : (
          // Render specific view (Settings, Contacts, etc.)
          renderSidebarView(currentView, handleBackToChats)
        )}
      </div>

      {/* Main Content Area */}
      <div 
        className={`
          flex-1 flex flex-col bg-slate-950 relative z-10
          ${!selectedChat ? 'hidden md:flex' : 'flex'}
        `}
      >
        {selectedChat ? (
          <ChatWindow 
            chat={selectedChat}
            messages={messages}
            currentUser={CURRENT_USER}
            onBack={() => setSelectedChat(undefined)}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 select-none p-4 text-center bg-[#0f172a] pattern-bg">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl shadow-black/20">
               <span className="text-4xl filter drop-shadow-md">🕊️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-200 mb-2">Hud-Hud Web</h1>
            <p className="max-w-xs text-sm text-gray-400">
              Select a chat to start messaging
            </p>
            <div className="mt-8 px-4 py-1.5 bg-slate-800/50 rounded-full text-[10px] font-medium text-primary-400 border border-slate-700">
              Encrypted • Fast • Secure
            </div>
          </div>
        )}
      </div>
    </div>
  );
};