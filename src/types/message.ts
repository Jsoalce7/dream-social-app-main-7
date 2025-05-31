export type MessageContentType = 'text' | 'battleRequest';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  contentType?: MessageContentType;
  battleId?: string;
  battleMode?: string;
  timestamp: number; // Using timestamp for ordering
}

export interface MessageThread {
  id: string;
  participants: string[]; // Array of user IDs
  lastMessage?: {
    senderId: string;
    content: string;
    timestamp: number;
  };
  createdAt: number;
  updatedAt: number;
}

// Update UserProfile type to include blocked users
declare module '@/types' {
  interface UserProfile {
    blockedUsersIds?: string[]; // Array of user IDs that this user has blocked
  }
}
