
import { collectionGroup, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const EXPIRATION_HOURS = 48;
const BATCH_LIMIT = 400; // Batas aman Firestore batch adalah 500

/**
 * Menghapus pesan yang dikirim oleh user saat ini yang lebih tua dari 48 jam.
 * Dijalankan di background saat aplikasi dimuat.
 */
export const cleanupExpiredMessages = async (currentUserId: string) => {
  try {
    // 1. Tentukan waktu batas (Sekarang - 48 Jam)
    const cutoffDate = new Date(Date.now() - EXPIRATION_HOURS * 60 * 60 * 1000);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // 2. Query Collection Group 'messages'
    // Filter: Pengirim adalah saya DAN waktu buat < waktu batas
    const q = query(
      collectionGroup(db, 'messages'),
      where('senderId', '==', currentUserId),
      where('createdAt', '<', cutoffTimestamp)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    // 3. Hapus menggunakan Batch (Chunking)
    const chunks = [];
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      chunks.push(docs.slice(i, i + BATCH_LIMIT));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

  } catch (error) {
    console.warn("[AutoCleanup] Cleanup skipped or failed (check permissions).");
  }
};
