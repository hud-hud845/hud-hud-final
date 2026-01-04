
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Users, Star, Wallet, 
  Search, Loader2, ShieldCheck, Banknote,
  BadgeCheck, ChevronRight, CheckCircle2, History,
  TrendingUp, CreditCard, Landmark, Clock, Megaphone,
  CheckCircle, XCircle, LayoutDashboard, Settings,
  AlertTriangle, ArrowUpRight, BarChart3, Menu, X, 
  LogOut, UserCog, UserCheck, ShieldAlert, Layers
} from 'lucide-react';
import { db, rtdb } from '../services/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { User, Transaction, Status } from '../types';
import { useAuth } from '../context/AuthContext';

interface AdminDashboardProps {
  onBack: () => void;
}

type AdminSubSection = 
  | 'overview' 
  | 'pro_applications' 
  | 'pro_user_mgmt' 
  | 'user_db' 
  | 'star_requests' 
  | 'ads_requests' 
  | 'payout_requests' 
  | 'bank_list' 
  | 'system_settings';

export const AdminProfessionalDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSubSection>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [adsApps, setAdsApps] = useState<any[]>([]);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    
    // Listen Users Global
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      setLoading(false);
    });

    // Listen Payouts RTDB
    const unsubPayout = onValue(ref(rtdb, 'admin_payout_requests'), (snapshot) => {
      const val = snapshot.val();
      setPayouts(val ? Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data } as Transaction)) : []);
    });

    return () => { unsubUsers(); unsubPayout(); };
  }, []);

  const stats = useMemo(() => {
    const proUsers = users.filter(u => u.isProfessional).length;
    const pendingPro = users.filter(u => u.isProfessional && !u.proActivatedAt).length;
    const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
    return { proUsers, pendingPro, pendingPayouts, totalUsers: users.length };
  }, [users, payouts]);

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Ikhtisar' },
    { id: 'pro_applications', icon: UserCheck, label: 'Pengajuan Dashboard', badge: stats.pendingPro },
    { id: 'pro_user_mgmt', icon: Layers, label: 'Manajemen Dashboard User' },
    { id: 'user_db', icon: UserCog, label: 'Pengaturan User' },
    { id: 'star_requests', icon: Star, label: 'Pengajuan Bintang' },
    { id: 'ads_requests', icon: Megaphone, label: 'Pengajuan Iklan' },
    { id: 'payout_requests', icon: Banknote, label: 'Penarikan Saldo', badge: stats.pendingPayouts },
    { id: 'bank_list', icon: Landmark, label: 'Daftar Bank' },
    { id: 'system_settings', icon: Settings, label: 'Pengaturan' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in duration-700">
             {/* Hero Welcome */}
             <div className="bg-gradient-to-r from-denim-800 to-denim-950 p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="relative z-10">
                   <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Selamat Datang, Super Admin</h1>
                   <p className="text-denim-200 text-sm font-medium">Sistem Kendali Profesional Hud-Hud v2.0</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { l: 'Kreator Pro', v: stats.proUsers, i: BadgeCheck, c: 'text-blue-600', b: 'bg-blue-50' },
                  { l: 'Antrean Pro', v: stats.pendingPro, i: UserCheck, c: 'text-amber-600', b: 'bg-amber-50' },
                  { l: 'Antrean Payout', v: stats.pendingPayouts, i: Banknote, c: 'text-green-600', b: 'bg-green-50' },
                  { l: 'Total Database', v: stats.totalUsers, i: Users, c: 'text-denim-600', b: 'bg-denim-50' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[32px] border border-cream-200 shadow-xl shadow-denim-900/5 flex items-center gap-5 transition-transform hover:-translate-y-1">
                     <div className={`p-4 ${s.b} ${s.c} rounded-2xl shadow-inner`}><s.i size={28} /></div>
                     <div><p className="text-[10px] font-black text-denim-400 uppercase tracking-widest">{s.l}</p><p className="text-2xl font-black text-denim-900">{s.v.toLocaleString()}</p></div>
                  </div>
                ))}
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-cream-200 shadow-xl">
                   <h3 className="font-black text-denim-900 mb-6 flex items-center gap-3 text-lg"><TrendingUp size={24} className="text-denim-600"/> Aktivitas Sistem</h3>
                   <div className="space-y-4">
                      {payouts.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-cream-50/50 rounded-2xl border border-cream-100 group hover:bg-white hover:shadow-md transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm"><Banknote size={20}/></div>
                              <div><p className="text-sm font-black text-denim-900">{p.userName}</p><p className="text-[10px] text-denim-400 uppercase font-bold tracking-tighter">Penarikan Saldo</p></div>
                           </div>
                           <p className="text-sm font-black text-denim-800">Rp{p.amount.toLocaleString()}</p>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-cream-200 shadow-xl">
                   <h3 className="font-black text-denim-900 mb-6 flex items-center gap-3 text-lg"><ShieldCheck size={24} className="text-blue-600"/> Kreator Baru</h3>
                   <div className="space-y-4">
                      {users.filter(u => u.isProfessional).slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 bg-cream-50/50 rounded-2xl border border-cream-100">
                           <div className="flex items-center gap-4">
                              <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                              <div><p className="text-sm font-black text-denim-900">{u.name}</p><p className="text-[10px] text-blue-600 uppercase font-bold tracking-tighter">Verified Pro</p></div>
                           </div>
                           <ChevronRight size={18} className="text-denim-200"/>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        );

      case 'user_db':
        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.phoneNumber?.includes(searchTerm));
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
             <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-denim-400" size={20}/><input type="text" placeholder="Cari nama atau nomor HP..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-cream-200 rounded-[28px] outline-none focus:ring-4 focus:ring-denim-500/10 shadow-xl text-denim-900"/></div>
             <div className="bg-white rounded-[40px] border border-cream-200 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead><tr className="bg-cream-50/50 border-b border-cream-100"><th className="px-8 py-6 text-[11px] font-black uppercase text-denim-400 tracking-widest">Pengguna</th><th className="px-8 py-6 text-[11px] font-black uppercase text-denim-400 tracking-widest">Akses</th><th className="px-8 py-6 text-[11px] font-black uppercase text-denim-400 tracking-widest">Tindakan</th></tr></thead>
                     <tbody className="divide-y divide-cream-50">
                        {filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-cream-50/30 transition-colors">
                             <td className="px-8 py-5"><div className="flex items-center gap-4"><img src={u.avatar} className="w-10 h-10 rounded-2xl object-cover shadow-sm"/><div className="min-w-0"><p className="text-sm font-black text-denim-900 truncate">{u.name}</p><p className="text-[11px] text-denim-400 font-medium">{u.phoneNumber}</p></div></div></td>
                             <td className="px-8 py-5">{u.isProfessional ? <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-tighter">Pro Kreator</span> : <span className="px-3 py-1 bg-cream-200 text-denim-400 text-[10px] font-black rounded-full uppercase tracking-tighter">Standard</span>}</td>
                             <td className="px-8 py-5"><button onClick={()=> { if(window.confirm(`Hapus permanen akun ${u.name}?`)) deleteDoc(doc(db, 'users', u.id)); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><XCircle size={22}/></button></td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
                </div>
             </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-denim-300 opacity-60">
            <div className="w-24 h-24 bg-cream-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <ShieldAlert size={48} className="animate-pulse" />
            </div>
            <p className="font-black uppercase tracking-[0.3em] text-sm mb-2">Modul Sedang Dihubungkan</p>
            <p className="text-xs font-bold text-denim-400">Database sinkronisasi dalam progres v2.1</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#f8f9fa] flex flex-row overflow-hidden font-sans">
      
      {/* LUXURY SIDEBAR - ALWAYS LEFT RESPONSIVE */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-denim-950 text-white transform transition-all duration-500 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-[20px_0_60px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
      `}>
         <div className="h-full flex flex-col p-8">
            {/* Sidebar Logo */}
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[18px] flex items-center justify-center text-denim-950 font-black shadow-2xl shadow-amber-500/20 text-2xl">H</div>
                  <div>
                    <h1 className="font-black text-xl tracking-tight leading-none">HUD-HUD</h1>
                    <p className="text-[10px] font-bold text-amber-500 tracking-[0.4em] mt-1">PRO PANEL</p>
                  </div>
               </div>
               <button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            {/* Sidebar Navigation */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar pr-2">
               {menuItems.map(item => (
                 <button 
                  key={item.id} 
                  onClick={() => { setActiveSection(item.id as AdminSubSection); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-[20px] transition-all duration-300 group ${activeSection === item.id ? 'bg-white text-denim-950 shadow-2xl scale-[1.02]' : 'hover:bg-white/5 text-denim-300'}`}
                 >
                    <div className="flex items-center gap-4">
                       <item.icon size={22} className={activeSection === item.id ? 'text-denim-800' : 'text-denim-600 group-hover:text-white'} />
                       <span className="text-[13px] font-black uppercase tracking-wider">{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-red-600 text-white shadow-lg">{item.badge}</span>
                    ) : null}
                 </button>
               ))}
            </nav>
            
            {/* Sidebar Footer */}
            <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
               <button onClick={() => { if(window.confirm("Keluar dari dashboard admin?")) logout(); }} className="w-full flex items-center gap-4 px-5 py-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[20px] transition-all group">
                  <LogOut size={22} className="group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-[13px] font-black uppercase tracking-wider">Log Out</span>
               </button>
               <div className="px-5 pt-4">
                  <p className="text-[9px] font-black text-denim-700 uppercase tracking-widest">System Build v2.10.4</p>
               </div>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-cream-50 relative">
         {/* Top Navigation Bar */}
         <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-cream-200 flex items-center justify-between px-8 shrink-0 z-40">
            <div className="flex items-center gap-6">
               <button onClick={()=>setIsSidebarOpen(true)} className="lg:hidden p-3 -ms-3 text-denim-900 hover:bg-cream-100 rounded-2xl transition-all shadow-sm"><Menu size={26}/></button>
               <div>
                 <h2 className="text-xl font-black text-denim-950 tracking-tight flex items-center gap-3">
                   {menuItems.find(m => m.id === activeSection)?.label}
                   <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                 </h2>
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="hidden sm:flex flex-col items-end">
                  <p className="text-xs font-black text-denim-950 uppercase tracking-widest">S. Admin Panel</p>
                  <p className="text-[9px] font-bold text-denim-400 uppercase tracking-tighter">Authorized Only</p>
               </div>
               <div className="w-12 h-12 bg-denim-100 rounded-[18px] flex items-center justify-center text-denim-900 border border-denim-200 shadow-sm relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-denim-200/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ShieldCheck size={28} className="relative z-10" />
               </div>
            </div>
         </header>
         
         {/* Content Scroll Area */}
         <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar relative">
            <div className="max-w-7xl mx-auto pb-20">
               {loading ? (
                 <div className="flex flex-col items-center justify-center h-[50vh] text-denim-400">
                    <div className="relative">
                       <Loader2 size={60} className="animate-spin mb-6 text-denim-900" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
                       </div>
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.5em] animate-pulse">Menghubungkan Inti Database...</p>
                 </div>
               ) : renderContent()}
            </div>
         </div>
         
         {/* Simple Fixed Footer */}
         <footer className="h-10 bg-white border-t border-cream-100 flex items-center justify-center text-[9px] font-black text-denim-300 uppercase tracking-[0.5em] absolute bottom-0 left-0 right-0 z-40">
            Hud-Hud Secure Control • 2024 &copy; High Performance Interface
         </footer>
      </main>

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && <div onClick={()=>setIsSidebarOpen(false)} className="fixed inset-0 z-[45] bg-denim-950/60 backdrop-blur-md lg:hidden animate-in fade-in duration-500"></div>}
    </div>
  );
};
