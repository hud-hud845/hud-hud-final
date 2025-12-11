import React from 'react';
import { MessageSquare, Users, BookUser, Settings, UserCircle } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate }) => {
  const navItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chats' },
    { id: 'groups', icon: Users, label: 'Groups' },
    { id: 'contacts', icon: BookUser, label: 'Contacts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'profile', icon: UserCircle, label: 'Profile' },
  ];

  return (
    <div className="w-16 md:w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
      <div className="mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">
          H
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              className={`
                group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                ${isActive ? 'bg-primary-600/20 text-primary-500' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
              `}
              title={item.label}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium hidden md:block opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};