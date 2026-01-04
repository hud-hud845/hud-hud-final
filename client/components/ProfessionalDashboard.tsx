
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, LayoutDashboard, TrendingUp, Star, Wallet, Building2, 
  ChevronRight, Info, AlertCircle, Landmark, CreditCard, User, 
  ArrowUpRight, History, MoreHorizontal, BadgeCheck, Loader2, Sparkles,
  BarChart3, MousePointer2, Plus, Pencil, Trash2, X, CheckCircle2,
  PieChart, DollarSign, Calendar, ChevronDown, Clock, CheckCircle, XCircle,
  BarChart, Zap, Megaphone, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, rtdb } from '../services/firebase';
import { ref, onValue, query as rtdbQuery, orderByChild, equalTo, push, set, remove as rtdbRemove, update, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { PayoutAccount, Transaction, Status } from '../types';
import { format } from 'date-fns';

interface DashboardProps {
  onBack: () => void;
}

type DashboardSubView = 'main' | 'summary' | 'monetization' | 'stars_detail' | 'ads_detail' | 'balance' | 'payout_settings';
type TimeFilter = '1' | '7' | '30' | 'all';

export const ProfessionalDashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [view, setView] = useState<DashboardSubView>('main');
  const [filterDays, setFilterDays] = useState<TimeFilter>('all');
  
  const [userStatuses, setUserStatuses] = useState<Status[]>([]);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [adsStatus, setAdsStatus] = useState<'none' | 'pending' | 'active'>('none');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const STAR_PRICE = 250;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen Status
    const statusRef = rtdbQuery(ref(rtdb, 'statuses'), orderByChild('userId'), equalTo(currentUser.id));
    const unsubStatus = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setUserStatuses(Object.entries(val).map(([id, data]: [string, any]) => ({
          id, ...data, likes: data.likes ? Object.keys(data.likes) : []
        })));
      } else { setUserStatuses([]); }
    });

    // 2. Listen Payout Accounts
    const accRef = ref(rtdb, `payout_accounts/${currentUser.id}`);
    const unsubAcc = onValue(accRef, (snapshot) => {
      const val = snapshot.val();
      setPayoutAccounts(val ? Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data } as PayoutAccount)) : []);
    });

    // 3. Listen Ads Status
    const adsRef = ref(rtdb, `ads_applications/${currentUser.id}`);
    const unsubAds = onValue(adsRef, (snap) => {
      const val = snap.val();
      setAdsStatus(val ? val.status : 'none');
    });

    return () => { unsubStatus(); unsubAcc(); unsubAds(); };
  }, [currentUser]);

  const filteredMetrics = useMemo(() => {
    const now = Date.now();
    let filtered = userStatuses;
    
    if (filterDays !== 'all') {
      const filterMs = parseInt(filterDays) * 24 * 60 * 60 * 1000;
      filtered = userStatuses.filter(s => {
        const created = typeof s.createdAt === 'number' ? s.createdAt : (s.createdAt?.seconds * 1000 || 0);
        return (now - created) <= filterMs;
      });
    }

    return filtered.reduce((acc, curr) => {
      acc.views += (curr.views || 0);
      acc.interactions += (curr.likes?.length || 0) + (curr.commentsCount || 0);
      acc.stars += (curr.stars || 0);
      return acc;
    }, { views: 0, interactions: 0, stars: 0 });
  }, [userStatuses, filterDays]);

  const handleApplyAds = async () => {
    if (!currentUser || isProcessing) return;
    setIsProcessing(true);
    try {
      await set(ref(rtdb, `ads_applications/${currentUser.id}`), {
        userId: currentUser.id,
        userName: currentUser.name,
        status: 'pending',
        appliedAt: Date.now()
      });
      showToast("Pengajuan Iklan Terkirim!");
    } finally { setIsProcessing(false); }
  };

  const Header = ({ title, onBackClick, rightAction }: { title: string, onBackClick: () => void, rightAction?: React.ReactNode }) => (
    <div className="h-[60px] px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] flex items-center justify-between bg-white border-b border-cream-200 sticky top-0 z-30 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={onBackClick} className="p-2 -ms-2 text-denim-600 hover:bg-cream-100 rounded-full transition-colors"><ArrowLeft size={22} /></button>
        <h2 className="text-lg font-black text-denim-900 tracking-tight">{title}</h2>
      </div>
      {rightAction}
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-lg ${color} bg-opacity-10 flex items-center justify-center`}>
        <Icon size={18} className={color.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-denim-400 uppercase tracking-tighter">{label}</p>
        <p className="text-lg font-black text-denim-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );

  if (view === 'main') return (
    <div className="h-full flex flex-col bg-cream-50 animate-in fade-in duration-300">
      <Header title="Dashboard Pro" onBackClick={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        
        {/* PROFILE CARD - MODERN DESIGN (UPDATE) */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-denim-700 via-denim-800 to-denim-900 p-6 rounded-[32px] shadow-xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-denim-400/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="relative">
                <img src={currentUser?.avatar} className="w-20 h-20 rounded-[24px] border-2 border-white/20 object-cover shadow-2xl bg-denim-800" />
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-lg border-2 border-denim-900 shadow-lg">
                  <BadgeCheck size={14} className="fill-current" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-white text-xl truncate tracking-tight">{currentUser?.name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] bg-white/10 backdrop-blur-md text-denim-100 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-white/5">Kreator Pro</span>
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </div>
              <button onClick={onBack} className="p-2.5 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors text-white">
                <Info size={18} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 pt-0 grid grid-cols-1 gap-4">
          <div className="bg-white border border-cream-200 rounded-[28px] p-5 shadow-sm">
             <div className="flex justify-between items-center mb-5 px-1">
                <h4 className="text-xs font-black text-denim-900 uppercase tracking-wider">Ringkasan Kinerja</h4>
                <button onClick={() => setView('summary')} className="flex items-center gap-1 text-[10px] font-black text-denim-600 bg-denim-50 px-3 py-1.5 rounded-full uppercase hover:bg-denim-100 transition-colors">
                  Detail <ChevronRight size={10} />
                </button>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-cream-50/50 rounded-2xl border border-cream-100 group hover:border-denim-200 transition-all">
                   <p className="text-[9px] font-black text-denim-400 uppercase tracking-tighter mb-1">Penayangan</p>
                   <p className="text-xl font-black text-denim-900">{filteredMetrics.views.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-cream-50/50 rounded-2xl border border-cream-100 group hover:border-green-200 transition-all">
                   <p className="text-[9px] font-black text-denim-400 uppercase tracking-tighter mb-1">Estimasi Saldo</p>
                   <p className="text-xl font-black text-green-600">Rp{(filteredMetrics.stars * 250).toLocaleString()}</p>
                </div>
             </div>
          </div>

          <div className="bg-white border border-cream-200 rounded-[28px] shadow-sm overflow-hidden">
             <div className="px-5 py-4 bg-cream-50/30 border-b border-cream-100"><p className="text-[10px] font-black text-denim-400 uppercase tracking-widest">Akses Monetisasi</p></div>
             <button onClick={() => setView('monetization')} className="w-full flex items-center justify-between p-5 hover:bg-cream-50 border-b border-cream-100 last:border-0 group transition-colors">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Sparkles size={22} fill="currentColor" /></div>
                   <div className="text-left">
                      <p className="font-black text-denim-900 text-sm">Monetisasi</p>
                      <p className="text-[10px] text-denim-400 font-bold uppercase">Bintang & Iklan In-Hud</p>
                   </div>
                </div>
                <ChevronRight size={18} className="text-denim-200 group-hover:text-denim-400 group-hover:translate-x-1 transition-all" />
             </button>
             <button onClick={() => setView('balance')} className="w-full flex items-center justify-between p-5 hover:bg-cream-50 border-b border-cream-100 last:border-0 group transition-colors">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Wallet size={22}/></div>
                   <div className="text-left">
                      <p className="font-black text-denim-900 text-sm">Dompet Pendapatan</p>
                      <p className="text-[10px] text-denim-400 font-bold uppercase">Penarikan Saldo & Riwayat</p>
                   </div>
                </div>
                <ChevronRight size={18} className="text-denim-200 group-hover:text-denim-400 group-hover:translate-x-1 transition-all" />
             </button>
             <button onClick={() => setView('payout_settings')} className="w-full flex items-center justify-between p-5 hover:bg-cream-50 border-b border-cream-100 last:border-0 group transition-colors">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Building2 size={22}/></div>
                   <div className="text-left">
                      <p className="font-black text-denim-900 text-sm">Rekening Bank</p>
                      <p className="text-[10px] text-denim-400 font-bold uppercase">Metode Pembayaran</p>
                   </div>
                </div>
                <ChevronRight size={18} className="text-denim-200 group-hover:text-denim-400 group-hover:translate-x-1 transition-all" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'summary') return (
    <div className="h-full flex flex-col bg-cream-50 animate-in slide-in-from-right-4 duration-300">
      <Header 
        title="Statistik Kinerja" 
        onBackClick={() => setView('main')} 
        rightAction={
          /* DROPDOWN FILTER MODERN (UPDATE) */
          <div className="relative">
            <select 
              value={filterDays} 
              onChange={(e) => setFilterDays(e.target.value as TimeFilter)}
              className="appearance-none bg-denim-700 hover:bg-denim-800 text-white text-[10px] font-black uppercase ps-5 pe-9 py-2.5 rounded-2xl outline-none border border-white/10 shadow-lg shadow-denim-900/10 cursor-pointer transition-all active:scale-95"
            >
              <option value="all">Keseluruhan</option>
              <option value="1">1 Hari Terakhir</option>
              <option value="7">7 Hari Terakhir</option>
              <option value="30">30 Hari Terakhir</option>
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-denim-200 pointer-events-none" />
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
         <div className="grid grid-cols-2 gap-3">
            <StatCard label="Penayangan" value={filteredMetrics.views} icon={BarChart3} color="bg-blue-500" />
            <StatCard label="Interaksi" value={filteredMetrics.interactions} icon={MousePointer2} color="bg-purple-500" />
            <StatCard label="Hadiah Bintang" value={filteredMetrics.stars} icon={Star} color="bg-yellow-500" />
            <StatCard label="Estimasi (Rp)" value={filteredMetrics.stars * 250} icon={DollarSign} color="bg-green-500" />
         </div>

         <div className="bg-white p-6 rounded-[32px] border border-cream-200 shadow-sm">
            <h4 className="text-[11px] font-black text-denim-900 uppercase tracking-widest mb-8 flex items-center gap-2">
               <TrendingUp size={16} className="text-denim-600" /> Distribusi Metrik
            </h4>
            
            <div className="h-44 w-full flex items-end justify-around gap-4 px-2 border-b border-cream-100 pb-2">
               {[
                 { h: filteredMetrics.views / 10, c: 'bg-gradient-to-t from-blue-600 to-blue-400', l: 'Views' },
                 { h: filteredMetrics.interactions / 2, c: 'bg-gradient-to-t from-purple-600 to-purple-400', l: 'Inter' },
                 { h: filteredMetrics.stars * 5, c: 'bg-gradient-to-t from-yellow-500 to-yellow-300', l: 'Stars' }
               ].map((bar, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <div 
                      className={`${bar.c} w-full max-w-[48px] rounded-t-xl transition-all duration-700 ease-out shadow-lg`} 
                      style={{ height: `${Math.min(Math.max(bar.h, 12), 110)}px` }}
                    />
                    <span className="text-[8px] font-black text-denim-400 uppercase tracking-tighter">{bar.l}</span>
                 </div>
               ))}
            </div>
            <p className="text-[10px] text-denim-400 mt-5 italic text-center font-medium opacity-70">Data diperbarui secara real-time berdasarkan aktivitas Anda.</p>
         </div>
      </div>
    </div>
  );

  if (view === 'monetization') return (
    <div className="h-full flex flex-col bg-cream-50 animate-in slide-in-from-right-4 duration-300">
      <Header title="Menu Monetisasi" onBackClick={() => setView('main')} />
      <div className="p-4 space-y-4">
         <button onClick={() => setView('stars_detail')} className="w-full bg-white p-6 rounded-[28px] border border-cream-200 shadow-sm flex items-center justify-between group active:scale-95 transition-all">
            <div className="flex items-center gap-5">
               <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shadow-inner"><Star size={24} fill="currentColor"/></div>
               <div className="text-left">
                  <p className="text-sm font-black text-denim-900">Bintang</p>
                  <p className="text-[10px] text-denim-400 font-bold uppercase tracking-tight">Kumpulkan saldo dari apresiasi fans</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">{filteredMetrics.stars}</span>
               <ChevronRight size={18} className="text-denim-200" />
            </div>
         </button>

         <button onClick={() => setView('ads_detail')} className="w-full bg-white p-6 rounded-[28px] border border-cream-200 shadow-sm flex items-center justify-between group active:scale-95 transition-all">
            <div className="flex items-center gap-5">
               <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><Megaphone size={24}/></div>
               <div className="text-left">
                  <p className="text-sm font-black text-denim-900">Iklan In-Hud</p>
                  <p className="text-[10px] text-denim-400 font-bold uppercase tracking-tight">Bagi hasil dari setiap tayangan iklan</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               {adsStatus === 'active' ? (
                 <span className="text-[9px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-black uppercase">Aktif</span>
               ) : adsStatus === 'pending' ? (
                 <span className="text-[9px] bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-black uppercase">Proses</span>
               ) : (
                 <Lock size={16} className="text-denim-200" />
               )}
               <ChevronRight size={18} className="text-denim-200" />
            </div>
         </button>
      </div>
    </div>
  );

  if (view === 'stars_detail') return (
    <div className="h-full flex flex-col bg-cream-50 animate-in slide-in-from-right-4 duration-300">
      <Header title="Detail Bintang" onBackClick={() => setView('monetization')} />
      <div className="p-4 space-y-5">
         <div className="bg-denim-800 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-yellow-400/10 blur-3xl rounded-full"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-denim-300 mb-2 opacity-80">Total Bintang Keseluruhan</p>
            <div className="flex items-center gap-4">
               <h2 className="text-5xl font-black">{filteredMetrics.stars}</h2>
               <Star size={36} className="text-yellow-400 animate-pulse" fill="currentColor" />
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[9px] font-black text-denim-400 uppercase mb-1">Dari Konten</p>
                  <p className="text-lg font-black">{filteredMetrics.stars}</p>
               </div>
               <div>
                  <p className="text-[9px] font-black text-denim-400 uppercase mb-1">Bonus Reward</p>
                  <p className="text-lg font-black text-white/40">0</p>
               </div>
            </div>
         </div>

         <button className="w-full bg-white p-5 rounded-[28px] border-2 border-dashed border-denim-200 flex items-center justify-center gap-3 hover:bg-denim-50 transition-all group active:scale-95">
            <div className="p-2.5 bg-denim-700 text-white rounded-xl shadow-lg group-hover:rotate-12 transition-transform"><Zap size={20} fill="currentColor"/></div>
            <span className="text-sm font-black text-denim-900 tracking-tight uppercase">Top Up Saldo Bintang</span>
         </button>

         <div className="bg-amber-50/50 p-5 rounded-[28px] border border-amber-100 flex gap-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0 shadow-sm"><Info size={20} /></div>
            <p className="text-[11px] text-amber-800 font-bold uppercase leading-relaxed pt-1">Bintang yang masuk akan otomatis masuk ke saldo yang bisa ditarik ke rekening bank.</p>
         </div>
      </div>
    </div>
  );

  if (view === 'ads_detail') return (
    <div className="h-full flex flex-col bg-cream-50 animate-in slide-in-from-right-4 duration-300">
      <Header title="Program Iklan" onBackClick={() => setView('monetization')} />
      <div className="p-8 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
         <div className="w-28 h-28 bg-blue-50 text-blue-600 rounded-[40px] flex items-center justify-center mb-8 shadow-inner border border-blue-100 relative">
            <Megaphone size={56} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-4 border-white"></div>
         </div>
         <h3 className="text-2xl font-black text-denim-900 mb-2 tracking-tight">Monetisasi Iklan</h3>
         <p className="text-sm text-denim-500 leading-relaxed max-w-xs mb-10 font-medium">
            Tampilkan iklan sela pada konten postingan Anda dan mulailah menghasilkan pendapatan pasif.
         </p>

         {adsStatus === 'active' ? (
           <div className="w-full p-5 bg-green-50 border border-green-200 rounded-[28px] flex items-center justify-center gap-3">
              <CheckCircle2 size={24} className="text-green-600" />
              <span className="text-base font-black text-green-700 uppercase">Status: Layanan Aktif</span>
           </div>
         ) : adsStatus === 'pending' ? (
           <div className="w-full p-8 bg-amber-50 border border-amber-200 rounded-[32px] shadow-sm">
              <Clock size={36} className="text-amber-500 mx-auto mb-4 animate-spin-slow" />
              <p className="text-base font-black text-amber-800 uppercase mb-1">Dalam Peninjauan</p>
              <p className="text-[11px] text-amber-600 font-bold uppercase leading-tight">Admin sedang meninjau akun Anda.</p>
           </div>
         ) : (
           <button 
             onClick={handleApplyAds}
             disabled={isProcessing}
             className="w-full py-5 bg-denim-800 hover:bg-denim-900 text-white rounded-[28px] font-black shadow-xl shadow-denim-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 border border-denim-700"
           >
              {isProcessing ? <Loader2 size={22} className="animate-spin" /> : <Megaphone size={20} />}
              DAFTAR PROGRAM IKLAN
           </button>
         )}
         
         <div className="mt-12 text-left w-full">
            <h5 className="text-[10px] font-black text-denim-400 uppercase tracking-[0.2em] mb-4">Persyaratan Kelayakan</h5>
            <div className="space-y-3">
               {[
                 { t: 'Min. 10 Postingan Aktif', v: true },
                 { t: '1.000+ Total Tayangan', v: true },
                 { t: 'Patuhi Pedoman Komunitas', v: true }
               ].map((req, i) => (
                 <div key={i} className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-cream-200 shadow-sm">
                   <div className="w-2 h-2 bg-denim-300 rounded-full" /> 
                   <span className="text-xs text-denim-800 font-black uppercase tracking-tighter">{req.t}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );

  // VIEW SALDO
  if (view === 'balance') return (
    <div className="h-full bg-cream-50 animate-in slide-in-from-right-4 duration-300">
      <Header title="Dompet Pendapatan" onBackClick={() => setView('main')} />
      <div className="flex flex-col h-full">
        <div className="p-10 text-center bg-white border-b border-cream-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pattern-bg opacity-[0.03]"></div>
          <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-green-100 shadow-inner relative z-10">
            <Wallet size={48} />
          </div>
          <p className="text-[10px] font-black text-denim-400 uppercase tracking-widest mb-2 relative z-10">Saldo Tersedia</p>
          <h2 className="text-4xl font-black text-denim-900 relative z-10 tracking-tight">Rp{(filteredMetrics.stars * STAR_PRICE).toLocaleString()}</h2>
          
          <button 
            onClick={async () => {
               if (filteredMetrics.stars === 0 || payoutAccounts.length === 0) {
                 alert("Pastikan saldo Anda tersedia dan rekening bank sudah terdaftar.");
                 return;
               }
               setIsProcessing(true);
               try {
                  const reqRef = push(ref(rtdb, 'admin_payout_requests'));
                  const data = {
                    id: reqRef.key, userId: currentUser?.id, userName: currentUser?.name, amount: filteredMetrics.stars * STAR_PRICE,
                    bankName: payoutAccounts[0].bankName, accountNumber: payoutAccounts[0].accountNumber,
                    accountHolder: payoutAccounts[0].accountHolder, status: 'pending', createdAt: Date.now()
                  };
                  await set(reqRef, data);
                  await set(ref(rtdb, `payout_history/${currentUser?.id}/${reqRef.key}`), data);
                  showToast("Penarikan berhasil diajukan!");
               } finally { setIsProcessing(false); }
            }}
            disabled={isProcessing || filteredMetrics.stars === 0}
            className="w-full mt-10 bg-denim-800 hover:bg-denim-900 text-white py-5 rounded-[28px] font-black shadow-2xl shadow-denim-900/10 active:scale-95 transition-all disabled:opacity-50 relative z-10 uppercase tracking-widest text-sm"
          >
            {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : "Tarik Dana Sekarang"}
          </button>
        </div>
        <div className="flex-1 p-6 bg-cream-50 overflow-y-auto custom-scrollbar">
           <h5 className="text-[10px] font-black text-denim-400 uppercase mb-4 tracking-widest">Ketentuan Penarikan</h5>
           <div className="bg-white p-5 rounded-[28px] border border-cream-200 shadow-sm space-y-4">
              <div className="flex gap-3">
                 <div className="w-5 h-5 bg-denim-100 text-denim-600 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]">1</div>
                 <p className="text-xs text-denim-700 font-medium leading-relaxed">Minimal penarikan saldo adalah Rp10.000.</p>
              </div>
              <div className="flex gap-3">
                 <div className="w-5 h-5 bg-denim-100 text-denim-600 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]">2</div>
                 <p className="text-xs text-denim-700 font-medium leading-relaxed">Proses pencairan memakan waktu 1-3 hari kerja.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  if (view === 'payout_settings') return (
    <div className="h-full flex flex-col bg-cream-50 animate-in slide-in-from-right-4 duration-300">
      <Header title="Pengaturan Bank" onBackClick={() => setView('main')} />
      <div className="p-4 space-y-4">
         {payoutAccounts.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] border border-cream-200 text-center flex flex-col items-center gap-6 shadow-sm">
               <div className="w-20 h-20 bg-cream-50 text-denim-100 rounded-full flex items-center justify-center"><Landmark size={64} /></div>
               <div>
                  <p className="text-base font-black text-denim-800">Rekening Belum Terdaftar</p>
                  <p className="text-xs text-denim-400 font-medium mt-1">Tambahkan rekening untuk menarik pendapatan Anda.</p>
               </div>
               <button onClick={() => {
                  const bank = prompt("Nama Bank (Misal: BCA, BRI, Mandiri):");
                  const num = prompt("Nomor Rekening:");
                  const holder = prompt("Nama Pemilik (Sesuai Buku Tabungan):");
                  if (bank && num && holder) {
                     const newRef = push(ref(rtdb, `payout_accounts/${currentUser?.id}`));
                     set(newRef, { bankName: bank, accountNumber: num, accountHolder: holder });
                  }
               }} className="px-10 py-3.5 bg-denim-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">TAMBAH REKENING</button>
            </div>
         ) : (
            payoutAccounts.map(acc => (
               <div key={acc.id} className="bg-white p-6 rounded-[32px] border border-cream-200 shadow-sm flex items-center justify-between group transition-all hover:border-denim-200">
                  <div className="flex items-center gap-5">
                     <div className="p-3.5 bg-blue-50 text-denim-700 rounded-2xl shadow-inner"><Landmark size={24}/></div>
                     <div>
                        <p className="text-sm font-black text-denim-900 tracking-tight">{acc.bankName}</p>
                        <p className="text-xs font-mono font-bold text-denim-500 mt-0.5 tracking-wider">{acc.accountNumber}</p>
                        <p className="text-[9px] font-bold text-denim-400 uppercase mt-1">An. {acc.accountHolder}</p>
                     </div>
                  </div>
                  <button onClick={() => { if(window.confirm("Hapus rekening ini?")) rtdbRemove(ref(rtdb, `payout_accounts/${currentUser?.id}/${acc.id}`)); }} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20}/></button>
               </div>
            ))
         )}
      </div>
    </div>
  );

  return null;
};
