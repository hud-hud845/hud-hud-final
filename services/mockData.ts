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
    name: 'Sarah Smith',
    avatar: 'https://picsum.photos/200/200?random=2',
    lastMessage: 'Project Hud-Hud is looking great! 🚀',
    unreadCount: 2,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    isPinned: true,
  },
  {
    id: 'c2',
    type: 'group',
    name: 'Dev Team Alpha',
    avatar: 'https://picsum.photos/200/200?random=3',
    lastMessage: 'Ali: Check the pull request please.',
    unreadCount: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
  {
    id: 'c3',
    type: 'direct',
    name: 'Budi Santoso',
    avatar: 'https://picsum.photos/200/200?random=4',
    lastMessage: 'Okay, see you tomorrow.',
    unreadCount: 0,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 'c4',
    type: 'direct',
    name: 'Support Bot',
    avatar: 'https://picsum.photos/200/200?random=5',
    lastMessage: 'Your ticket #9921 has been resolved.',
    unreadCount: 0,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
   {
    id: 'c5',
    type: 'direct',
    name: 'Siti Aminah',
    avatar: 'https://picsum.photos/200/200?random=6',
    lastMessage: 'Can you send the PDF?',
    unreadCount: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), 
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    senderId: 'u2',
    content: 'Hi Ahmad! How is the development going?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    type: 'text',
    status: 'read',
  },
  {
    id: 'm2',
    senderId: 'u1',
    content: 'Going well! We are implementing the new Sidebar layout now.',
    timestamp: new Date(Date.now() - 1000 * 60 * 55),
    type: 'text',
    status: 'read',
  },
  {
    id: 'm3',
    senderId: 'u2',
    content: 'That sounds awesome. Make sure it is responsive for mobile users.',
    timestamp: new Date(Date.now() - 1000 * 60 * 50),
    type: 'text',
    status: 'read',
  },
  {
    id: 'm4',
    senderId: 'u1',
    content: 'Absolutely. Using Tailwind for that.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    type: 'text',
    status: 'delivered',
  },
];