
// CLOUDINARY SERVICE
// Menggunakan Unsigned Upload untuk keamanan di sisi client

const CLOUD_NAME = "dpxzpczpc"; 
const UPLOAD_PRESET = "hud_hud_preset"; 

// Fungsi Kompresi Gambar Menggunakan Canvas (Dioptimalkan)
// Resize ke max 1280px dan quality 0.7 memberikan keseimbangan terbaik size vs quality
export const compressImage = (file: File, quality = 0.7, maxWidth = 1280): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Validasi tipe file image
    if (!file.type.match(/image.*/)) {
      resolve(file); // Jika bukan image, kembalikan aslinya
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Logika Resize Proporsional
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Peningkatan kualitas rendering saat downscaling
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Konversi ke JPEG untuk kompresi maksimal
              lastModified: Date.now(),
            });
            // console.log(`Kompresi: ${(file.size/1024).toFixed(2)}KB -> ${(compressedFile.size/1024).toFixed(2)}KB`);
            resolve(compressedFile);
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

type ResourceType = 'image' | 'video' | 'raw' | 'auto' | 'audio';

export const uploadFileToCloudinary = async (file: File, resourceType: ResourceType = 'auto'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  // Cloudinary API endpoint changes based on resource type
  // Images = image/upload
  // Audio/Video = video/upload
  // Documents (PDF/Doc) = raw/upload OR auto/upload
  
  const typeEndpoint = resourceType === 'audio' ? 'video' : resourceType; 

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${typeEndpoint}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gagal mengupload file');
    }

    const data = await response.json();
    return data.secure_url; // URL HTTPS aman
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

// Backward compatibility wrapper
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  // Compress first
  try {
    const compressed = await compressImage(file);
    return await uploadFileToCloudinary(compressed, 'image');
  } catch (e) {
    console.warn("Kompresi gagal, upload original:", e);
    return await uploadFileToCloudinary(file, 'image');
  }
};
