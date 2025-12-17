
import React, { useState, useEffect } from 'react';
import { 
  X, User, Users, Settings, 
  HelpCircle, MessageSquare, LogOut, AlertTriangle, Radio, BadgeCheck, Activity, Bell
} from 'lucide-react';
import { User as UserType, ViewState } from '../types';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';
import { AppSettings } from './Layout';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onNavigate: (view: ViewState) => void;
  activeView: ViewState;
  appSettings: AppSettings;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onNavigate,
  activeView,
  appSettings
}) => {
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const t = translations[appSettings.language];

  // Fetch Unread Notifications Count
  useEffect(() => {
    if (!currentUser) return;
    
    // Query notifikasi milik user yang belum dibaca (read == false)
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.id),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Menu items - Menambahkan Notifikasi di antara Kontak dan Pengaturan
  const menuItems = [
    { id: 'chats', icon: MessageSquare, label: t.nav.chats },
    { id: 'status', icon: Activity, label: t.nav.status },
    { id: 'groups', icon: Users, label: t.nav.groups },
    { id: 'contacts', icon: User, label: t.nav.contacts },
    { id: 'notifications', icon: Bell, label: t.nav.notifications, badge: unreadNotifCount }, // Badge Count here
    { id: 'settings', icon: Settings, label: t.nav.settings },
    { id: 'help', icon: HelpCircle, label: t.nav.help },
  ];

  // Jika admin, tambahkan menu Broadcast
  if (currentUser.isAdmin) {
    menuItems.splice(2, 0, { id: 'broadcast', icon: Radio, label: t.nav.broadcast, badge: 0 });
  }

  const handleNavigation = (viewId: string) => {
    onNavigate(viewId as ViewState);
    onClose();
  };

  const handleProfileClick = () => {
    onNavigate('profile');
    onClose();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      onClose();
    } catch (error) {
      console.error("Gagal logout", error);
    }
  };

  const isRtl = appSettings.language === 'ar';

  return (
    <>
      {/* Backdrop Sidebar */}
      <div 
        className={`
          absolute inset-0 bg-denim-900/40 backdrop-blur-[2px] z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer Sidebar */}
      <div 
        className={`
          absolute top-0 bottom-0 w-[280px] sm:w-[320px] bg-cream-50 z-50 shadow-2xl
          transform transition-transform duration-300 cubic-bezier(0.25, 0.46, 0.45, 0.94)
          border-e border-cream-200 flex flex-col start-0
          ${isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
        `}
      >
        {/* Profile Header (Clickable) */}
        <div 
          className="p-6 bg-denim-700 relative cursor-pointer hover:bg-denim-800 transition-colors"
          onClick={handleProfileClick}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 text-denim-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 rtl:left-4 rtl:right-auto"
          >
            <X size={20} />
          </button>
          
          <div className="flex-col gap-3 mt-2 flex">
            <div className="relative w-16 h-16">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-full h-full rounded-full object-cover border-2 border-white/20 shadow-lg"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-denim-700 rounded-full rtl:left-0 rtl:right-auto"></span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg flex items-center gap-1">
                {currentUser.name}
                {currentUser.isAdmin && <BadgeCheck size={18} className="text-blue-400 fill-current" />}
              </h3>
              <p className="text-denim-200 text-sm font-medium">{t.common.online}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar bg-cream-50">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  w-full flex items-center gap-4 px-6 py-3.5 transition-all duration-200 group relative
                  ${isActive ? 'bg-denim-100 text-denim-700' : 'text-denim-800 hover:bg-cream-100 hover:text-denim-700'}
                `}
              >
                <div className="relative">
                  <item.icon 
                    size={22} 
                    className={`transition-colors ${isActive ? 'text-denim-600' : 'text-denim-500 group-hover:text-denim-600'}`} 
                  />
                  {/* Notification Badge */}
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-cream-50 shadow-sm animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="font-medium text-[15px]">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-denim-600 rounded-e-full rtl:right-0 rtl:left-auto"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer & Logout */}
        <div className="p-4 border-t border-cream-200 bg-cream-50">
          <button 
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors group mb-2"
          >
            <LogOut size={22} className="group-hover:text-red-600 rtl:rotate-180" />
            <span className="font-medium text-[15px] group-hover:text-red-600">{t.nav.logout}</span>
          </button>
          
          <div className="text-center text-xs text-denim-400 mt-2">
            <p>Hud-Hud Web v1.2.0</p>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-cream-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-lg font-bold text-denim-900 mb-2">{t.nav.logoutConfirmTitle}</h3>
              <p className="text-denim-500 text-sm mb-6">
                {t.nav.logoutConfirmMsg}
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-denim-700 font-medium rounded-xl transition-colors"
                >
                  {t.nav.cancel}
                </button>
                <button 
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-500/30"
                >
                  {t.nav.yesLogout}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
