import React from 'react';
import { 
  X, User, Users, Settings, 
  CircleHelp, MessageSquare, LogOut 
} from 'lucide-react';
import { User as UserType, ViewState } from '../types';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onNavigate: (view: ViewState) => void;
  activeView: ViewState;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onNavigate,
  activeView 
}) => {
  const menuItems = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'new_group', icon: Users, label: 'New Group' },
    { id: 'contacts', icon: User, label: 'Contacts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'help', icon: CircleHelp, label: 'Help' },
  ];

  const handleNavigation = (viewId: string) => {
    onNavigate(viewId as ViewState);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`
          absolute top-0 left-0 bottom-0 w-[280px] sm:w-[320px] bg-slate-900 z-50 shadow-2xl
          transform transition-transform duration-300 cubic-bezier(0.25, 0.46, 0.45, 0.94)
          border-r border-gray-800 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Profile Header */}
        <div className="p-6 bg-slate-800 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X size={20} />
          </button>
          
          <div className="flex flex-col gap-3 mt-2">
            <div className="relative w-16 h-16">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-full h-full rounded-full object-cover border-2 border-slate-700 shadow-lg"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-800 rounded-full"></span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{currentUser.name}</h3>
              <p className="text-primary-400 text-sm font-medium">Online</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  w-full flex items-center gap-4 px-6 py-3.5 transition-all duration-200 group relative
                  ${isActive ? 'bg-primary-500/10 text-primary-400' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon 
                  size={22} 
                  className={`transition-colors ${isActive ? 'text-primary-400' : 'text-gray-400 group-hover:text-primary-400'}`} 
                />
                <span className="font-medium text-[15px]">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"></div>
                )}
              </button>
            );
          })}
          
          <div className="my-2 border-t border-gray-800 mx-6"></div>
          
          <button className="w-full flex items-center gap-4 px-6 py-3.5 text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={22} />
            <span className="font-medium text-[15px]">Log Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-xs text-gray-600 border-t border-gray-800">
          <p>Hud-Hud Web v1.0.1</p>
        </div>
      </div>
    </>
  );
};