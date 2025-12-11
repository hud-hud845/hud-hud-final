import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Phone, Video, Paperclip, Smile, Send, Mic, ArrowLeft } from 'lucide-react';
import { ChatPreview, Message, User } from '../types';
import { format } from 'date-fns';

interface ChatWindowProps {
  chat: ChatPreview;
  messages: Message[];
  currentUser: User;
  onBack: () => void;
  onSendMessage: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages, currentUser, onBack, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-slate-900/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          
          <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full" />
          
          <div>
            <h2 className="font-semibold text-gray-100">{chat.name}</h2>
            <p className="text-xs text-primary-400">Online</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-400">
          <button className="hover:text-primary-400 transition-colors hidden sm:block"><Phone size={20} /></button>
          <button className="hover:text-primary-400 transition-colors hidden sm:block"><Video size={20} /></button>
          <button className="hover:text-white transition-colors pl-2 border-l border-gray-700"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-0">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`
                  max-w-[85%] md:max-w-[65%] px-4 py-2 rounded-2xl relative shadow-md
                  ${isMe 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-100 rounded-bl-none'
                  }
                `}
              >
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                  {format(msg.timestamp, 'HH:mm')}
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900/90 backdrop-blur-sm border-t border-gray-800 z-10">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <button className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800">
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 bg-gray-800 rounded-2xl flex items-center px-4 py-2 min-h-[48px]">
             <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Write a message..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            />
            <button className="text-gray-400 hover:text-yellow-400 transition-colors ml-2">
              <Smile size={20} />
            </button>
          </div>

          <button 
            onClick={inputText.trim() ? handleSend : undefined}
            className={`
              p-3 rounded-full transition-all duration-200 transform
              ${inputText.trim() 
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg scale-100' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            {inputText.trim() ? <Send size={20} /> : <Mic size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};