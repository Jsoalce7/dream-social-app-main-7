import { Timestamp } from 'firebase/firestore';

export type BattleRequestStatus = 'pending' | 'accepted' | 'declined';

export interface BattleRequest {
  id?: string; // Will be set by Firestore
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  battleId: string;
  mode: string;
  status: BattleRequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
