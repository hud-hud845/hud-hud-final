
export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string; // Field baru untuk Nomor HP
  avatar: string;
  bio?: string;
  status: 'online' | 'offline' | 'typing';
  lastSeen?: string;
  isAdmin?: boolean; // Admin Flag
}

export interface Contact {
  id: string;        // ID dokumen di sub-collection contacts
  uid: string;       // UID asli pengguna tersebut (referensi ke users collection)
  savedName: string; // Nama yang disimpan oleh user (bisa beda dengan nama asli user)
  phoneNumber: string;
  avatar: string;    // Cache avatar untuk tampilan cepat
}

export interface Message {
  id: string;
  senderId: string;
  content: string; // Plain text content
  timestamp: any; // Firestore Timestamp or Date
  type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
  
  // File & Media Props
  fileUrl?: string;
  fileName?: string;
  fileSize?: string; // e.g., "2.5 MB"
  mimeType?: string;
  
  // Audio Props
  duration?: number; // in seconds
  
  // Location Props
  location?: {
    latitude: number;
    longitude: number;
  };
  
  // Contact Props
  contact?: {
    uid: string;
    name: string;
    phoneNumber: string;
    avatar: string;
  };

  // Reply Props
  replyTo?: {
    id: string;
    senderName: string;
    content: string; // Preview text
    type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
  };

  status: 'sent' | 'delivered' | 'read';
  readBy?: string[]; // Array of User IDs who have read this message
}

export interface ChatPreview {
  id: string;
  type: 'direct' | 'group';
  participants: string[]; // Array of User IDs
  adminIds?: string[]; // Array of Admin User IDs (Only for groups)
  name: string; // Display name for the chat (Raw from DB)
  description?: string; // Group description
  avatar: string;
  lastMessage: string;
  lastMessageType?: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
  unreadCount?: number; // Legacy support
  unreadCounts?: Record<string, number>; // Map userId -> number of unread messages
  updatedAt: any; // Firestore Timestamp
  createdAt?: any;
  isPinned?: boolean;
  typing?: Record<string, any>; // Map userId -> Timestamp (Last typed time)
}

export type ViewState = 'chats' | 'groups' | 'contacts' | 'settings' | 'help' | 'profile' | 'broadcast';
