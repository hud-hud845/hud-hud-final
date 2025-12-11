export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing';
  lastSeen?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'audio';
  status: 'sent' | 'delivered' | 'read';
}

export interface ChatPreview {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: Date;
  isPinned?: boolean;
}

export type ViewState = 'chats' | 'new_group' | 'contacts' | 'settings' | 'help' | 'profile';