import React, { useState } from 'react';
import { Search, Pin, Menu } from 'lucide-react';
import { ChatPreview } from '../types';
import { format } from 'date-fns';

interface ChatListProps {
  chats: ChatPreview[];
  activeChatId?: string;
  onSelectChat: (chat: ChatPreview) => void;
  onOpenMenu: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, activeChatId, onSelectChat, onOpenMenu }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0f172a] w-full relative">
      {/* Header with Menu & Search */}
      <div className="px-4 py-3 flex gap-3 items-center sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur-sm">
        <button 
          onClick={onOpenMenu}
          className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"
        >
          <Menu size={24} />
        </button>
        
        <div className="flex-1 relative group">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-500 transition-colors" 
            size={18} 
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 text-gray-100 pl-10 pr-4 py-2 rounded-full text-[15px] focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:bg-slate-800/80 transition-all placeholder-gray-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`
              group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
              ${activeChatId === chat.id 
                ? 'bg-primary-600 shadow-md shadow-primary-900/20' 
                : 'hover:bg-slate-800'
              }
            `}
          >
            <div className="relative shrink-0">
              <img 
                src={chat.avatar} 
                alt={chat.name} 
                className="w-12 h-12 rounded-full object-cover bg-slate-800"
              />
              {/* Online indicator handled by status logic mostly, hardcoded for visual pop here */}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-[#0f172a] rounded-full"></span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 
                  className={`
                    font-semibold text-[15px] truncate 
                    ${activeChatId === chat.id ? 'text-white' : 'text-gray-100'}
                  `}
                >
                  {chat.name}
                </h3>
                <div className={`flex items-center gap-1 text-xs ${activeChatId === chat.id ? 'text-primary-100' : 'text-gray-500'}`}>
                  {chat.isPinned && <Pin size={12} className="rotate-45" />}
                  <span>{format(chat.timestamp, 'HH:mm')}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p 
                  className={`
                    text-[14px] truncate pr-2
                    ${activeChatId === chat.id ? 'text-primary-100' : 'text-gray-400 group-hover:text-gray-300'}
                  `}
                >
                  {chat.lastMessage}
                </p>
                {chat.unreadCount > 0 && (
                  <span 
                    className={`
                      min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full shadow-sm
                      ${activeChatId === chat.id ? 'bg-white text-primary-600' : 'bg-green-500 text-white'}
                    `}
                  >
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};