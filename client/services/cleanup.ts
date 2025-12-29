
import { ref, get, remove, query as rtdbQuery, orderByChild, endAt, update } from 'firebase/database';
import { rtdb } from './firebase';

/**
 * Menghapus Status yang sudah expired (lewat dari field expiresAt) di RTDB.
 */
export const cleanupExpiredStatuses = async () => {
    try {
        const now = Date.now();
        // Query status yang expiresAt-nya lebih kecil dari waktu sekarang
        const statusesRef = rtdbQuery(ref(rtdb, 'statuses'), orderByChild('expiresAt'), endAt(now));
        const snapshot = await get(statusesRef);
        
        if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => {
                // Hapus status dan komentar terkait
                updates[`statuses/${child.key}`] = null;
                updates[`comments/${child.key}`] = null;
            });
            await update(ref(rtdb), updates);
            console.log(`[AutoCleanup] Berhasil menghapus status yang kadaluwarsa.`);
        }
    } catch (error) {
        console.warn("[AutoCleanup] Gagal membersihkan status:", error);
    }
};

/**
 * Menghapus Notifikasi yang sudah expired di RTDB untuk user tertentu.
 * Dipanggil saat user login/load aplikasi.
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
            console.log(`[AutoCleanup] Berhasil menghapus notifikasi kadaluwarsa milik user ${userId}.`);
        }
    } catch (error) {
        console.warn("[AutoCleanup] Gagal membersihkan notifikasi:", error);
    }
};

/**
 * Cleanup expired messages logic (optional, for RTDB efficiency)
 */
export const cleanupExpiredMessages = async (chatId: string) => {
    // Implementasi jika ingin menghapus riwayat chat lama secara otomatis
};
