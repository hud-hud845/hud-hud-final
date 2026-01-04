
import { uploadFileToCloudinary, compressImage } from './cloudinary';

// KONFIGURASI MINIO
const MINIO_CONFIG = {
  endpoint: 'minio-hud-hud.my.id',
  accessKey: 'admin',
  secretKey: 'password123',
  port: 443,
  useSSL: true,
  bucket: 'hud-hud-storage'
};

type FolderType = 'profile' | 'chat' | 'status';

/**
 * Fungsi utama untuk upload media dengan sistem Failover
 * @param file File mentah dari input
 * @param folder Folder tujuan di storage
 * @param progressCallback Opsional untuk memantau progress
 */
export const uploadMedia = async (
  file: File, 
  folder: FolderType, 
  progressCallback?: (p: string) => void
): Promise<string> => {
  // 1. KOMPRESI OTOMATIS (Jika Gambar)
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    if (progressCallback) progressCallback('Mengompresi...');
    try {
      fileToUpload = await compressImage(file, 0.7, 1280);
    } catch (e) {
      console.warn("Kompresi gagal, menggunakan file asli", e);
    }
  }

  // 2. LOGIKA FAILOVER (MINIO 7s -> CLOUDINARY)
  try {
    if (progressCallback) progressCallback('Mengunggah ke Utama...');
    
    // Kita gunakan Promise.race untuk deteksi timeout 7 detik
    return await Promise.race([
      uploadToMinio(fileToUpload, folder),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('MINIO_TIMEOUT')), 7000)
      )
    ]);
  } catch (error: any) {
    console.warn(`[Storage] Minio Gagal (${error.message}), beralih ke Cloudinary...`);
    if (progressCallback) progressCallback('Beralih ke Cadangan...');
    
    // Jika Minio gagal atau timeout, gunakan Cloudinary sebagai fallback
    return await uploadFileToCloudinary(fileToUpload, 'auto');
  }
};

/**
 * Logika Upload ke Minio menggunakan Fetch API (S3 PUT Object)
 * Catatan: Untuk keamanan produksi, biasanya menggunakan Presigned URL dari backend.
 * Di sini kita asumsikan bucket dikonfigurasi untuk menerima akses terstruktur.
 */
async function uploadToMinio(file: File, folder: FolderType): Promise<string> {
  const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const url = `https://${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/${fileName}`;

  // Simulasi Upload Langsung (Membutuhkan CORS di sisi Minio diaktifkan)
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
      // Jika Minio membutuhkan Auth Header S3 V4, ini biasanya dihandle oleh backend 
      // untuk menghasilkan Presigned URL. Kita asumsikan endpoint ini siap menerima PUT.
    }
  });

  if (!response.ok) throw new Error('Minio Upload Failed');
  
  return url;
}
