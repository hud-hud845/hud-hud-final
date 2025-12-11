
# Panduan Integrasi Hud-Hud (Part 2)

Dokumen ini menjelaskan langkah-langkah untuk menghubungkan aplikasi Hud-Hud dengan layanan Backend (Firebase) dan Media (Cloudinary).

## 1. Setup Firebase (Authentication & Database)

### A. Buat Proyek
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik **"Add project"** dan beri nama `hud-hud-app`.
3. Nonaktifkan Google Analytics untuk simplifikasi setup awal.

### B. Setup Authentication
1. Di menu sidebar kiri, pilih **Build** > **Authentication**.
2. Klik **Get Started**.
3. Pilih tab **Sign-in method**.
4. Aktifkan **Google**:
   - Klik **Enable**.
   - Isi email support.
   - Klik **Save**.
5. (Opsional) Aktifkan **Email/Password** jika ingin login manual.

### C. Setup Firestore Database
1. Di menu sidebar kiri, pilih **Build** > **Firestore Database**.
2. Klik **Create Database**.
3. Pilih lokasi server (contoh: `asia-southeast2` untuk Jakarta/Singapura agar cepat).
4. Pilih **Start in test mode** (agar kita bisa baca/tulis tanpa aturan ketat dulu saat development).
5. Klik **Create**.

### D. Dapatkan Konfigurasi
1. Klik icon **Gear** (Settings) di samping "Project Overview".
2. Pilih **Project settings**.
3. Scroll ke bawah ke bagian "Your apps".
4. Klik icon **Web (</>)**.
5. Beri nama App (misal: "Hud-Hud Web").
6. Salin objek `firebaseConfig` yang muncul.
7. Tempel (Paste) config tersebut ke dalam file `client/services/firebase.ts` di kodingan Anda.

---

## 2. Setup Cloudinary (Storage Gambar/File)

Meskipun kode untuk upload file belum sepenuhnya diimplementasikan di UI ChatWindow pada tahap ini, berikut persiapan akunnya:

1. Daftar di [Cloudinary](https://cloudinary.com/).
2. Di Dashboard, cari **Product Environment Credentials**.
3. Salin **Cloud Name**, **API Key**, dan **API Secret**.
4. Di masa depan, kita akan menggunakan *Unsigned Upload Preset* untuk upload dari frontend React:
   - Ke **Settings** (icon gear) > **Upload**.
   - Scroll ke "Upload presets".
   - Klik **Add upload preset**.
   - Signing Mode: **Unsigned**.
   - Save.

---

## 3. Menjalankan Aplikasi

1. Pastikan dependensi terinstall: `npm install firebase`.
2. Jalankan: `npm run dev`.
3. Aplikasi akan menampilkan halaman Login. Klik **"Masuk dengan Google"**.
4. Setelah login berhasil, data user Anda akan otomatis dibuat di Firestore (koleksi `users`).
5. Anda bisa mengecek Firestore Console untuk melihat data user yang baru dibuat.
