
import { Timestamp } from 'firebase/firestore'; // Import Firestore Timestamp for clarity

export type UserRole = 'admin' | 'creator' | 'coach' | 'user';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  tiktokUsername?: string;
  avatarUrl?: string;
  role?: UserRole;
  diamonds?: number;
  createdAt?: Timestamp;
  lastSeen?: Timestamp;
  isOnline?: boolean;
  blockedUsers?: string[];
  mutedThreads?: string[];
}

export type BattleStatus = 'pending' | 'accepted' | 'declined' | 'ongoing' | 'completed';
export type BattleMode = 'Standard' | 'Duet' | 'Team' | 'Tournament';
export type BattleRequestType = 'Direct' | 'Open';

export interface Battle {
  id: string;
  battleId: string; // Alias for id for compatibility
  creatorA?: UserProfile; // Made optional
  creatorB?: UserProfile; // Made optional
  creatorAId: string;
  creatorBId: string;
  creatorAName: string;
  creatorBName: string;
  creatorAAvatar: string;
  creatorBAvatar: string;
  dateTime: Timestamp;
  mode: BattleMode;
  status: BattleStatus;
  requestedBy?: string; // Made optional
  requestType?: BattleRequestType; // Made optional
  createdAt?: Timestamp; // Made optional
  updatedAt?: Timestamp; // Made optional
  
  // For battle requests
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: string;
  receiverName?: string;
  receiverAvatar?: string;
  
  // For battle requests list
  title?: string;
  description?: string;
  prize?: number;
  rules?: string[];
  participants?: string[];
  judges?: string[];
  winnerId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  isLive?: boolean;
  isPrivate?: boolean;
  isVerified?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  sponsorName?: string;
  sponsorLogo?: string;
  sponsorUrl?: string;
  tags?: string[];
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  timezone?: string;
  timezoneOffset?: number;
  language?: string;
  category?: string;
  subcategory?: string;
  ageRestriction?: number;
  maxParticipants?: number;
  minParticipants?: number;
  entryFee?: number;
  currency?: string;
  payoutSplit?: number[];
  payoutAddress?: string;
  payoutCurrency?: string;
  payoutStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  payoutTxId?: string;
  payoutAmount?: number;
  payoutDate?: Timestamp;
  payoutMethod?: string;
  payoutDetails?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  activeIcon?: React.ElementType;
}

export interface AdminConfig {
  id?: string;
  homepageTitle?: string;
  homepageBannerURL?: string;
  enableBattles?: boolean;
  enableEvents?: boolean;
  enableCommunityChat?: boolean;
  featuredEventId?: string;
}

// Community Channel specific types (existing, kept for clarity)
export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp; 
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  text: string;
  timestamp: Timestamp; 
  channelId?: string;
}

// --- New Direct Messaging System Types ---

export interface DirectMessageReaction {
  emoji: string;    // The emoji character
  userId: string;   // ID of the user who reacted
}

export interface DirectMessage {
  id: string;         // Message ID
  threadId: string;   // ID of the thread this message belongs to
  senderId: string;   // ID of the user who sent the message
  // senderProfile will be denormalized for display
  senderProfile: {
    fullName: string;
    avatarUrl?: string;
  };
  content: string;    // Message text
  contentType: 'text' | 'image' | 'video' | 'emoji' | 'system' | 'battleRequest'; // For future extensions like images, system messages
  timestamp: Timestamp; // Firestore ServerTimestamp
  updatedAt?: Timestamp; // For edited messages
  isReadBy: string[]; // Array of user IDs who have read the message
  reactions?: DirectMessageReaction[];
  battleId?: string;  // ID of the battle if this is a battle request
  battleMode?: BattleMode; // Type of battle being requested
  // For replies, if needed in the future
  // replyToMessageId?: string; 
}

export interface TypingIndicator {
  userId: string;
  fullName: string; // To display "User is typing..."
  isTyping: boolean;
  lastTypingAt?: Timestamp; // Added lastTypingAt for consistency
}

export interface DirectMessageThread {
  id: string;                             // Thread ID (e.g., combination of sorted user IDs)
  participantIds: string[];               // Array of 2 user IDs, sorted lexically to ensure uniqueness
  // Denormalized participant profiles for easier display in thread lists
  participantProfiles: Record<string, UserProfile>; // Use UserProfile for consistency
  createdAt: Timestamp;                   // Firestore ServerTimestamp
  updatedAt: Timestamp;                   // Firestore ServerTimestamp (when last message was sent or thread was updated)
  lastMessage?: DirectMessage | null; // Use full DirectMessage type
  // Unread counts per user in the thread
  unreadCounts: {
    [userId: string]: number;
  };
  // For admin monitoring
  isFlagged?: boolean;
  flaggedBy?: string; // userId of admin who flagged
  flagReason?: string;
  // Store typing indicators directly in the thread for easy subscription
  typingUsers?: TypingIndicator[];
}

export * from './message';
