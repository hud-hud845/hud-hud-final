import { ChatPreview, Message, User } from '../types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Ahmad Fulan',
  avatar: 'https://picsum.photos/200/200?random=1',
  status: 'online',
};

export const MOCK_CHATS: ChatPreview[] = [
  {
    id: 'c1',
    type: 'direct',
    participants: ['u2'],
    name: 'Sarah Santoso',
    avatar: 'https://picsum.photos/200/200?random=2',
    lastMessage: 'Proyek Hud-Hud terlihat bagus! 🚀',
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    isPinned: true,
  },
  {
    id: 'c2',
    type: 'group',
    participants: ['u3', 'u4'],
    name: 'Tim Developer Alpha',
    avatar: 'https://picsum.photos/200/200?random=3',
    lastMessage: 'Ali: Tolong cek pull request ya.',
    unreadCount: 5,
    updatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
  {
    id: 'c3',
    type: 'direct',
    participants: ['u3'],
    name: 'Budi Hartono',
    avatar: 'https://picsum.photos/200/200?random=4',
    lastMessage: 'Oke, sampai jumpa besok.',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 'c4',
    type: 'direct',
    participants: ['bot'],
    name: 'Bot Layanan',
    avatar: 'https://picsum.photos/200/200?random=5',
    lastMessage: 'Tiket #9921 Anda telah diselesaikan.',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
   {
    id: 'c5',
    type: 'direct',
    participants: ['u5'],
    name: 'Siti Aminah',
    avatar: 'https://picsum.photos/200/200?random=6',
    lastMessage: 'Bisa kirimkan file PDF-nya?',
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 25), 
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    senderId: 'u2',
    content: 'Hai Ahmad! Bagaimana perkembangan aplikasinya?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    type: 'text',
    status: 'read',
  },
  {
    id: 'm2',
    senderId: 'u1',
    content: 'Berjalan lancar! Kami sedang menerapkan tema Denim & Cream sekarang.',
    timestamp: new Date(Date.now() - 1000 * 60 * 55),
    type: 'text',
    status: 'read',
  },
  {
    id: 'm3',
    senderId: 'u2',
    content: 'Kedengarannya elegan. Pastikan responsif untuk mobile ya.',
    timestamp: new Date(Date.now() - 1000 * 60 * 50),
    type: 'text',
    status: 'read',
  },
  {
    id: 'm4',
    senderId: 'u1',
    content: 'Tentu saja. Semua menu sidebar sudah diupdate.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    type: 'text',
    status: 'delivered',
  },
];