import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from '@/types';

/**
 * Creates a thread ID in the same format as the security rules
 * This MUST match the getThreadId function in the security rules
 */
export function getThreadId(uid1: string, uid2: string): string {
  const u1 = String(uid1);
  const u2 = String(uid2);
  return u1 < u2 ? `${u1}_${u2}` : `${u2}_${u1}`;
}

/**
 * Checks if a user exists in the users collection
 */
async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
}

/**
 * Creates a direct message thread between two users
 * This function strictly follows the Firestore security rules
 */
export async function createDirectMessageThread(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string> {
  if (!currentUser?.id || !otherUser?.id) {
    throw new Error("Both users must have valid IDs");
  }

  // Generate the thread ID exactly as in the security rules
  const uid1 = String(currentUser.id);
  const uid2 = String(otherUser.id);
  
  // Security rules expect the IDs to be ordered lexicographically
  const threadId = getThreadId(uid1, uid2);
  
  // The participantIds array MUST match the order used in the thread ID
  const participantIds = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];

  console.log("🔍 Creating thread with ID:", threadId);
  console.log("🔍 Current user ID:", uid1);
  console.log("🔍 Other user ID:", uid2);
  console.log("🔍 Participant IDs (ordered):", participantIds);

  // Check if both users exist in the users collection
  const currentUserExists = await checkUserExists(uid1);
  const otherUserExists = await checkUserExists(uid2);

  if (!currentUserExists || !otherUserExists) {
    console.error("❌ User existence check failed:", {
      currentUserExists,
      otherUserExists
    });
    throw new Error("One or both users do not exist in the users collection");
  }

  // Check if thread already exists
  const threadRef = doc(db, 'dmThreads', threadId);
  const threadQuery = query(collection(db, 'dmThreads'), where('__name__', '==', threadId), limit(1));
  const threadSnap = await getDocs(threadQuery);
  
  if (!threadSnap.empty) {
    console.log("✅ Thread already exists with ID:", threadId);
    return threadId;
  }

  console.log("❌ Thread does not exist, creating new thread with ID:", threadId);
  
  // Create participant profiles for the thread
  // This MUST be a map with user IDs as keys
  const participantProfiles: Record<string, any> = {};
  participantProfiles[participantIds[0]] = {
    id: participantIds[0],
    fullName: participantIds[0] === uid1 ? (currentUser.fullName || 'Unknown') : (otherUser.fullName || 'Unknown'),
    avatarUrl: participantIds[0] === uid1 ? (currentUser.avatarUrl || '') : (otherUser.avatarUrl || ''),
    email: participantIds[0] === uid1 ? (currentUser.email || '') : (otherUser.email || '')
  };
  participantProfiles[participantIds[1]] = {
    id: participantIds[1],
    fullName: participantIds[1] === uid1 ? (currentUser.fullName || 'Unknown') : (otherUser.fullName || 'Unknown'),
    avatarUrl: participantIds[1] === uid1 ? (currentUser.avatarUrl || '') : (otherUser.avatarUrl || ''),
    email: participantIds[1] === uid1 ? (currentUser.email || '') : (otherUser.email || '')
  };

  // Create the thread object with EXACTLY the fields required by the security rules
  const threadData = {
    participantIds: participantIds,
    participantProfiles: participantProfiles,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    unreadCounts: {
      [participantIds[0]]: 0,
      [participantIds[1]]: 0
    }
  };

  // Log the exact data being sent
  console.log("✅ Thread data keys:", Object.keys(threadData));
  
  try {
    // Create the thread document
    await setDoc(threadRef, threadData);
    console.log("✅ Thread created successfully!");
    return threadId;
  } catch (error) {
    console.error("❌ Error creating thread:", error);
    // Try to provide more detailed error information
    if (error instanceof Error) {
      console.error("❌ Error details:", error.message);
      if ('code' in error) {
        console.error("❌ Error code:", (error as any).code);
      }
    }
    throw error;
  }
}

/**
 * Sends a direct message in a thread
 * This function strictly follows the Firestore security rules
 */
export async function sendDirectMessage(
  currentUser: UserProfile,
  threadId: string,
  content: string,
  contentType: 'text' | 'image' = 'text'
): Promise<void> {
  if (!currentUser?.id || !threadId || !content.trim()) {
    throw new Error("User, thread, and content are required");
  }

  // Get the thread document to verify participant IDs
  const threadQuery = query(collection(db, 'dmThreads'), where('__name__', '==', threadId), limit(1));
  const threadSnap = await getDocs(threadQuery);
  
  if (threadSnap.empty) {
    throw new Error("Thread does not exist");
  }

  const threadData = threadSnap.docs[0].data();
  
  // Ensure the current user is a participant in the thread
  if (!threadData.participantIds.includes(currentUser.id)) {
    throw new Error("User is not a participant in this thread");
  }

  // Determine the receiver ID (the other participant)
  const receiverId = threadData.participantIds.find((id: string) => id !== currentUser.id);
  if (!receiverId) {
    throw new Error("Could not determine receiver ID");
  }

  console.log("📤 Sending message to thread:", threadId);
  console.log("📤 Current user ID:", currentUser.id);
  console.log("📤 Receiver ID:", receiverId);

  // Create message data exactly as required by security rules
  const messageData = {
    senderId: currentUser.id,
    receiverId: receiverId,
    content: content.trim(),
    contentType: contentType,
    timestamp: serverTimestamp(),
    threadId: threadId,
    senderProfile: {
      id: currentUser.id,
      fullName: currentUser.fullName || 'User',
      avatarUrl: currentUser.avatarUrl || '',
      email: currentUser.email || ''
    }
  };
  
  console.log("📤 Message data keys:", Object.keys(messageData));

  // Create the message document
  const messagesRef = collection(db, 'dmThreads', threadId, 'directMessages');
  const messageDoc = doc(messagesRef);
  await setDoc(messageDoc, messageData);
  
  console.log("✅ Message sent successfully!");
}
