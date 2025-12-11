
/**
 * E2EE Service using Web Crypto API
 * Algorithm: ECDH (Key Exchange) + AES-GCM (Encryption)
 */

// Utils untuk konversi ArrayBuffer <-> Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// 1. GENERATE KEY PAIR (ECDH P-256) - 1:1 Chat & Identity
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // Extractable (bisa diexport untuk disimpan)
    ["deriveKey", "deriveBits"]
  );
};

// 2. EXPORT KEY KE JWK (JSON Web Key) UNTUK DISIMPAN
export const exportKey = async (key: CryptoKey): Promise<JsonWebKey> => {
  return await window.crypto.subtle.exportKey("jwk", key);
};

// 3. IMPORT KEY DARI JWK
export const importKey = async (jwk: JsonWebKey, type: 'public' | 'private'): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    type === 'private' ? ["deriveKey", "deriveBits"] : []
  );
};

// 4. DERIVE SHARED SECRET (AES-GCM Key)
// Menggabungkan Private Key Saya + Public Key Lawan
export const deriveSharedSecret = async (privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> => {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// 5. ENCRYPT MESSAGE (AES-GCM)
export const encryptMessage = async (text: string, sharedKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // IV (Initialization Vector) harus unik setiap pesan
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

// 6. DECRYPT MESSAGE
export const decryptMessage = async (ciphertextB64: string, ivB64: string, sharedKey: CryptoKey): Promise<string> => {
  try {
    const ciphertext = base64ToArrayBuffer(ciphertextB64);
    const iv = base64ToArrayBuffer(ivB64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      sharedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    // Kembalikan string yang informatif agar UI tidak crash
    // Ini biasanya terjadi jika:
    // 1. Kunci privat pengguna diganti (Login ulang di HP baru) -> Pesan lama tidak bisa dibaca.
    // 2. Pengirim menggunakan Public Key lama yang sudah kadaluwarsa.
    return "⚠️ Pesan terkunci (Sesi berubah)";
  }
};

// --- GROUP E2EE HELPERS ---

// 7. GENERATE GROUP KEY (Symmetric AES-GCM)
export const generateGroupKey = async (): Promise<CryptoKey> => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // Extractable agar bisa didistribusikan
    ["encrypt", "decrypt"]
  );
};

// 8. EXPORT GROUP KEY (Raw Bytes -> Base64)
export const exportSymKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
};

// 9. IMPORT GROUP KEY (Base64 -> CryptoKey)
export const importSymKey = async (base64Key: string): Promise<CryptoKey> => {
  const buffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "raw",
    buffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// LOCAL STORAGE HELPERS
const STORAGE_KEY_PRIVATE = 'hudhud_priv_key';
const STORAGE_KEY_PUBLIC = 'hudhud_pub_key';

export const storeKeyPairLocally = (privateJwk: JsonWebKey, publicJwk: JsonWebKey) => {
  localStorage.setItem(STORAGE_KEY_PRIVATE, JSON.stringify(privateJwk));
  localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(publicJwk));
};

export const getStoredPrivateKey = (): JsonWebKey | null => {
  const stored = localStorage.getItem(STORAGE_KEY_PRIVATE);
  return stored ? JSON.parse(stored) : null;
};

export const getStoredPublicKey = (): JsonWebKey | null => {
  const stored = localStorage.getItem(STORAGE_KEY_PUBLIC);
  return stored ? JSON.parse(stored) : null;
};
