
export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string; 
  avatar: string;
  bio?: string;
  address?: string; // Field baru untuk alamat lengkap
  status: 'online' | 'offline' | 'typing';
  lastSeen?: string;
  isAdmin?: boolean;
  isProfessional?: boolean; // Status apakah dashboard pro aktif
}

export interface ProfessionalApplication {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAvatar: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface StarRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any;
}

export interface Contact {
  id: string;        
  uid: string;       
  savedName: string; 
  phoneNumber: string;
  avatar: string;    
}

export interface Message {
  id: string;
  senderId: string;
  content: string; 
  timestamp: any; 
  type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string; 
  mimeType?: string;
  duration?: number; 
  location?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    uid: string;
    name: string;
    phoneNumber: string;
    avatar: string;
  };
  replyTo?: {
    id: string;
    senderName: string;
    content: string; 
    type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
  };
  status: 'sent' | 'delivered' | 'read';
  readBy?: string[]; 
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: any;
  isAdmin?: boolean; 
  replyTo?: {
    userName: string;
    text: string;
  };
}

export interface Status {
  id: string;
  userId: string;
  author: {
    name: string;
    avatar: string;
    isAdmin?: boolean; 
  };
  content?: string;
  imageUrl?: string;
  likes: string[]; 
  commentsCount: number;
  stars?: number; 
  views?: number; 
  createdAt: any;
  expiresAt: any; 
}

export interface Notification {
  id: string;
  recipientId: string; 
  senderId: string;    
  senderName: string;
  senderAvatar: string;
  type: 'like' | 'comment' | 'reply'; 
  statusId: string;    
  previewText?: string; 
  createdAt: any;
  read: boolean;
  expiresAt: any;
  statusOwnerId?: string;     // ID pemilik status
  statusOwnerName?: string;   // Nama pemilik status
}

export interface ChatPreview {
  id: string;
  type: 'direct' | 'group';
  participants: string[]; 
  adminIds?: string[]; 
  name: string; 
  description?: string; 
  avatar: string;
  lastMessage: string;
  lastMessageType?: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
  unreadCount?: number; 
  unreadCounts?: Record<string, number>; 
  updatedAt: any; 
  createdAt?: any;
  isPinned?: boolean;
  typing?: Record<string, any>; 
}

export interface PayoutAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  createdAt: any;
  bankName: string;
  accountNumber?: string;
}

export type ViewState = 'chats' | 'status' | 'my_status' | 'groups' | 'contacts' | 'notifications' | 'settings' | 'help' | 'profile' | 'broadcast' | 'professional_dashboard' | 'admin_professional_dashboard';
