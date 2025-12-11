import React from 'react';
import { ArrowLeft, Search, UserPlus, Bell, Lock, Smartphone, Monitor, ChevronRight, HelpCircle, FileText, MessageCircle } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarViewProps {
  onBack: () => void;
}

// --- Common Header Component ---
const ViewHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="h-[60px] px-4 flex items-center gap-4 bg-[#0f172a] border-b border-gray-800 sticky top-0 z-10">
    <button 
      onClick={onBack}
      className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
    >
      <ArrowLeft size={20} />
    </button>
    <h2 className="text-lg font-semibold text-white">{title}</h2>
  </div>
);

// --- New Group View ---
export const NewGroupView: React.FC<SidebarViewProps> = ({ onBack }) => {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title="New Group" onBack={onBack} />
      <div className="p-4">
        <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors border border-dashed border-gray-600">
          <UserPlus size={24} className="text-primary-400" />
        </div>
        <input 
          type="text" 
          placeholder="Group Name" 
          className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 mb-6 placeholder-gray-500"
        />
        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 px-2">Select Members</div>
        {/* Mock Members */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer">
             <div className="w-10 h-10 rounded-full bg-gray-700"></div>
             <div className="h-3 w-32 bg-gray-800 rounded"></div>
          </div>
        ))}
      </div>
      <div className="p-4 mt-auto">
        <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors">
          Create Group
        </button>
      </div>
    </div>
  );
};

// --- Contacts View ---
export const ContactsView: React.FC<SidebarViewProps> = ({ onBack }) => {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title="Contacts" onBack={onBack} />
      <div className="p-2">
        <div className="relative mb-4 px-2 pt-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search contacts" 
            className="w-full bg-slate-800 pl-10 pr-4 py-2 rounded-full text-sm focus:outline-none text-white placeholder-gray-500"
          />
        </div>
        <button className="w-full flex items-center gap-4 p-3 hover:bg-slate-800 rounded-lg text-primary-400 mb-2 transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <span className="font-medium">Invite Friends</span>
        </button>
        
        <div className="space-y-1">
          {['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'David Lee', 'Emma Wilson'].map((name, i) => (
            <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-white flex items-center justify-center font-semibold">
                {name.charAt(0)}
              </div>
              <div>
                <h3 className="text-gray-100 font-medium">{name}</h3>
                <p className="text-xs text-gray-500 group-hover:text-gray-400">last seen recently</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Settings View ---
export const SettingsView: React.FC<SidebarViewProps> = ({ onBack }) => {
  const settingsItems = [
    { icon: Bell, label: 'Notifications and Sounds', color: 'bg-red-500/20 text-red-400' },
    { icon: Lock, label: 'Privacy and Security', color: 'bg-green-500/20 text-green-400' },
    { icon: Monitor, label: 'Chat Settings', color: 'bg-blue-500/20 text-blue-400' },
    { icon: Smartphone, label: 'Devices', color: 'bg-orange-500/20 text-orange-400' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0f172a] animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title="Settings" onBack={onBack} />
      <div className="overflow-y-auto custom-scrollbar">
        <div className="p-4 flex flex-col items-center border-b border-gray-800 pb-6 bg-slate-900/50">
           <div className="w-24 h-24 rounded-full bg-gray-700 mb-3 relative overflow-hidden group cursor-pointer">
             <img src="https://picsum.photos/200/200?random=1" alt="Profile" className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-xs text-white">Change</span>
             </div>
           </div>
           <h3 className="text-xl font-semibold text-white">Ahmad Fulan</h3>
           <p className="text-gray-400 text-sm">+62 812 3456 7890</p>
           <p className="text-primary-400 text-xs mt-1">@ahmadfulan</p>
        </div>

        <div className="p-2">
          {settingsItems.map((item, i) => (
            <button key={i} className="w-full flex items-center gap-4 p-3 hover:bg-slate-800 rounded-lg transition-colors group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon size={18} />
              </div>
              <span className="flex-1 text-left text-gray-200 text-[15px]">{item.label}</span>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Help View ---
export const HelpView: React.FC<SidebarViewProps> = ({ onBack }) => {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title="Help" onBack={onBack} />
      <div className="p-2 space-y-1">
        {[
          { icon: HelpCircle, label: 'Ask a Question' },
          { icon: FileText, label: 'Telegram FAQ' },
          { icon: MessageCircle, label: 'Privacy Policy' }
        ].map((item, i) => (
          <button key={i} className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 rounded-lg transition-colors border-b border-gray-800/50 last:border-0">
            <item.icon size={20} className="text-primary-400" />
            <span className="text-gray-200">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto p-6 text-center">
         <p className="text-gray-500 text-xs">Hud-Hud for Web</p>
         <p className="text-gray-600 text-[10px] mt-1">Version 1.0.1 (2024)</p>
      </div>
    </div>
  );
};

// Factory to render based on ViewState
export const renderSidebarView = (view: ViewState, onBack: () => void) => {
  switch (view) {
    case 'new_group': return <NewGroupView onBack={onBack} />;
    case 'contacts': return <ContactsView onBack={onBack} />;
    case 'settings': return <SettingsView onBack={onBack} />;
    case 'help': return <HelpView onBack={onBack} />;
    default: return null;
  }
};