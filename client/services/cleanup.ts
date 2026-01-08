
import { ref, get, remove, query as rtdbQuery, orderByChild, endAt, update } from 'firebase/database';
import { rtdb } from './firebase';

/**
 * Menghapus Status yang sudah expired (lewat dari field expiresAt) di RTDB.
 * Status secara default diatur expiresAt = createdAt + 48 Jam.
 */
export const cleanupExpiredStatuses = async () => {
    try {
        const now = Date.now();
        const statusesRef = rtdbQuery(ref(rtdb, 'statuses'), orderByChild('expiresAt'), endAt(now));
        const snapshot = await get(statusesRef);
        
        if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => {
                updates[`statuses/${child.key}`] = null;
                updates[`comments/${child.key}`] = null;
            });
            await update(ref(rtdb), updates);
            console.log(`[AutoCleanup] Status kadaluwarsa dibersihkan.`);
        }
    } catch (error) {
        console.warn("[AutoCleanup] Gagal membersihkan status:", error);
    }
};

/**
 * Menghapus Notifikasi yang sudah expired di RTDB untuk user tertentu.
 */
export const cleanupExpiredNotifications = async (userId: string) => {
    if (!userId) return;
    try {
        const now = Date.now();
        const notifRef = rtdbQuery(ref(rtdb, `notifications/${userId}`), orderByChild('expiresAt'), endAt(now));
        const snapshot = await get(notifRef);
        
        if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => {
                updates[`notifications/${userId}/${child.key}`] = null;
            });
            await update(ref(rtdb), updates);
        }
    } catch (error) {
        console.warn("[AutoCleanup] Gagal membersihkan notifikasi:", error);
    }
};

/**
 * Menghapus Riwayat Chat secara otomatis jika usia > 48 Jam (2X24 Jam).
 * Ini memastikan database tetap ramping dan aplikasi ngebut.
 */
export const cleanupExpiredMessages = async (chatId: string) => {
    if (!chatId) return;
    try {
        const now = Date.now();
        const threshold = now - (48 * 60 * 60 * 1000); // 48 jam yang lalu
        
        const messagesRef = rtdbQuery(
            ref(rtdb, `messages/${chatId}`), 
            orderByChild('createdAt'), 
            endAt(threshold)
        );
        
        const snapshot = await get(messagesRef);
        
        if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => {
                updates[`messages/${chatId}/${child.key}`] = null;
            });
            await update(ref(rtdb), updates);
            console.log(`[Database Slimmer] Berhasil menghapus riwayat chat lama di ${chatId}`);
        }
    } catch (error) {
        console.warn("[Database Slimmer] Gagal membersihkan pesan:", error);
    }
};
