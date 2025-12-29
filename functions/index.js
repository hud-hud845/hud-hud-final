const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Fungsi ini akan otomatis jalan setiap ada pesan baru masuk 
 * ke Realtime Database pada path /messages/{chatId}/{messageId}
 */
exports.sendChatNotification = functions.database.ref('/messages/{chatId}/{messageId}')
    .onCreate(async (snapshot, context) => {
        // 1. Ambil data pesan yang baru saja masuk
        const message = snapshot.val();
        const receiverId = message.receiverId; 
        const senderName = message.senderName || 'Seseorang';
        const text = message.text || 'Mengirim pesan baru';

        console.log(`Ada pesan baru untuk: ${receiverId} dari: ${senderName}`);

        // 2. Cari fcmToken si penerima di FIRESTORE
        try {
            const userDoc = await admin.firestore().collection('users').doc(receiverId).get();
            
            if (!userDoc.exists) {
                console.log('Data user tidak ditemukan di Firestore');
                return null;
            }

            const userData = userDoc.data();
            const fcmToken = userData.fcmToken;

            if (!fcmToken) {
                console.log('User tidak memiliki fcmToken (mungkin belum login di HP)');
                return null;
            }

            // 3. Susun Paket Notifikasi
            const payload = {
                notification: {
                    title: `Pesan baru dari ${senderName}`,
                    body: text,
                    sound: 'default',
                    badge: '1'
                },
                // Data tambahan agar saat notif diklik, aplikasi bisa tahu harus buka chat mana
                data: {
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    senderId: message.senderId || '',
                    type: 'chat'
                }
            };

            // 4. Kirim notifikasi ke perangkat tujuan
            const response = await admin.messaging().sendToDevice(fcmToken, payload);
            console.log('Notifikasi berhasil dikirim:', response);
            return response;

        } catch (error) {
            console.error('Terjadi kesalahan saat mengirim notifikasi:', error);
            return null;
        }
    });