
import React, { useState } from 'react';
import { Radio, AlertTriangle, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment, doc } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { db, rtdb } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';
import { AppSettings } from './Layout';
import { ViewHeader } from './SidebarViews';

interface AdminViewProps {
  onBack: () => void;
  appSettings?: AppSettings;
}

// --- BROADCAST VIEW ---
export const BroadcastView: React.FC<AdminViewProps> = ({ onBack, appSettings }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const t = translations[appSettings?.language || 'id'];

  const handleBroadcast = async () => {
    if (!message.trim() || !currentUser?.isAdmin) return;
    setSending(true);
    setProgress(0);
    
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.filter(d => d.id !== currentUser.id);
      setTotal(allUsers.length);
      
      const broadcastMsg = message.trim();
      let sentCount = 0;

      for (const uDoc of allUsers) {
        const targetId = uDoc.id;
        const targetData = uDoc.data();
        
        const q = query(collection(db, 'chats'), where('type', '==', 'direct'), where('participants', 'array-contains', targetId));
        const chatSnap = await getDocs(q);
        let chatId = '';
        
        let existing = chatSnap.docs.find(d => d.data().participants.includes(currentUser.id));
        if (existing) {
          chatId = existing.id;
        } else {
          const newChatRef = await addDoc(collection(db, 'chats'), {
            type: 'direct',
            participants: [currentUser.id, targetId],
            name: targetData.name || 'User',
            avatar: targetData.avatar || '',
            lastMessage: broadcastMsg,
            lastMessageType: 'text',
            unreadCounts: { [targetId]: 1, [currentUser.id]: 0 },
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            typing: {}
          });
          chatId = newChatRef.id;
        }

        const msgRef = push(ref(rtdb, `messages/${chatId}`));
        await set(msgRef, {
          senderId: currentUser.id,
          content: broadcastMsg,
          type: 'text',
          status: 'sent',
          createdAt: Date.now()
        });

        if (existing) {
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: broadcastMsg,
            lastMessageType: 'text',
            updatedAt: serverTimestamp(),
            [`unreadCounts.${targetId}`]: increment(1)
          });
        }
        
        sentCount++;
        setProgress(sentCount);
      }

      alert(t.broadcast.success.replace('{count}', sentCount.toString()));
      setMessage('');
    } catch (e) {
      console.error(e);
      alert("Gagal mengirim broadcast.");
    } finally {
      setSending(false);
    }
  };

  if (!currentUser?.isAdmin) return <div className="p-4 text-center font-bold text-red-500">Akses Ditolak</div>;

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.broadcast.title} onBack={onBack} />
      <div className="p-4 pb-32 md:pb-0 flex-1 overflow-y-auto custom-scrollbar">
         <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3">
            <AlertTriangle className="text-yellow-600 shrink-0" />
            <div>
              <h4 className="font-bold text-yellow-800 text-sm">Peringatan Keamanan</h4>
              <p className="text-xs text-yellow-700 mt-1">{t.broadcast.warning}</p>
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-widest mb-2 ml-1">{t.broadcast.messageLabel}</label>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                className="w-full h-40 p-4 rounded-2xl bg-cream-50 border border-cream-300 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 transition-all resize-none text-sm leading-relaxed" 
                placeholder={t.broadcast.placeholder}
                disabled={sending}
              />
            </div>
            
            {sending && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-denim-600">
                  <span>Mengirim...</span>
                  <span>{progress} / {total}</span>
                </div>
                <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div className="h-full bg-denim-600 transition-all duration-300" style={{ width: `${(progress/total) * 100}%` }}></div>
                </div>
              </div>
            )}

            <button 
              onClick={handleBroadcast} 
              disabled={sending || !message.trim()} 
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {sending ? <Loader2 className="animate-spin" /> : <Radio size={20} />} 
              {sending ? t.broadcast.sending : t.broadcast.send}
            </button>
         </div>
      </div>
    </div>
  );
};
