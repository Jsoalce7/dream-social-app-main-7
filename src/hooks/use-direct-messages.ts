import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { UserProfile, DirectMessageThread, DirectMessage, TypingIndicator } from '@/types';
import { getThreadId } from './use-direct-message-threads'; // Re-use getThreadId

const TYPING_TIMEOUT_MS = 3000; // Stop showing typing indicator after 3s of no activity

export interface UseDirectMessagesResult {
  messages: DirectMessage[];
  loadingMessages: boolean;
  errorMessages: string | null;
  sendMessage: (content: string, contentType?: DirectMessage['contentType']) => Promise<void>;
  // Typing Indicators
  sendTypingIndicator: (isTyping: boolean) => Promise<void>;
  typingUsers: TypingIndicator[];
  // Read Receipts - basic for now
  markMessagesAsRead: () => Promise<void>;
}

export function useDirectMessages(threadId: string | null): UseDirectMessagesResult {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTypingStateRef = useRef<boolean>(false);


  // Listener for messages in the current thread
  useEffect(() => {
    if (!threadId || !currentUser?.id || authLoading) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'dmThreads', threadId, 'directMessages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: DirectMessage[] = [];
      snapshot.forEach((doc) => {
        // Explicitly cast timestamp for safety if needed, though Firestore handles it
        const data = doc.data();
         const message = {
           id: doc.id,
           senderId: data.senderId,
           receiverId: data.receiverId,
           content: data.content, // Use content field to match what's stored in Firestore
           timestamp: data.timestamp instanceof Timestamp ? data.timestamp : new Timestamp(data.timestamp?.seconds || 0, data.timestamp?.nanoseconds || 0),
           isRead: data.isRead,
           threadId: data.threadId,
           // Include other fields from snapshot if they exist and are needed for frontend
           senderProfile: data.senderProfile,
           contentType: data.contentType,
           isReadBy: data.isReadBy
         } as unknown as DirectMessage; // Cast to DirectMessage
        fetchedMessages.push(message);
      });
      setMessages(fetchedMessages);
      setLoadingMessages(false);
      setErrorMessages(null);
    }, (err) => {
      console.error(`Error fetching messages for thread ${threadId}:`, err);
      setErrorMessages(`Failed to fetch messages: ${err.message}`);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [threadId, currentUser?.id, authLoading]);

  // Listener for typing indicators in the current thread
  useEffect(() => {
    if (!threadId || !currentUser?.id) {
      setTypingUsers([]);
      return;
    }

    const threadRef = doc(db, 'dmThreads', threadId);
    const unsubscribeTyping = onSnapshot(threadRef, (docSnap) => {
      if (docSnap.exists()) {
        const threadData = docSnap.data() as DirectMessageThread;
        if (threadData.typingUsers) {
          // Filter out current user's typing indicator for display
          setTypingUsers(threadData.typingUsers.filter(tu => tu.userId !== currentUser.id && tu.isTyping));
        } else {
          setTypingUsers([]);
        }
      }
    });
    
    return () => unsubscribeTyping();
  }, [threadId, currentUser?.id]);


  const sendMessage = useCallback(async (content: string, contentType: DirectMessage['contentType'] = 'text'): Promise<void> => {
    if (!threadId || !currentUser?.id || !content.trim() || authLoading) {
      setErrorMessages("Cannot send message: User not authenticated, thread not selected, or message empty.");
      return;
    }

    try {
      // Import the utility function that strictly follows the security rules
      const { sendDirectMessage } = await import('@/lib/direct-message-utils');
      
      // Use the utility function to send the message - only pass 'text' or 'image' types
      // as these are the only ones supported by the utility function
      const safeContentType = contentType === 'text' || contentType === 'image' ? contentType : 'text';
      await sendDirectMessage(currentUser, threadId, content.trim(), safeContentType);
      
      console.log("✅ Message sent successfully using utility function");
      
      // Update the thread document with the last message info and unread counts
      const threadRef = doc(db, 'dmThreads', threadId);
      
      // Get the current thread data
      const currentThreadSnap = await getDocs(query(collection(db, 'dmThreads'), where('__name__', '==', threadId), limit(1)));
      if (currentThreadSnap.empty) {
        console.error("Thread not found after sending message");
        return;
      }
      
      const currentThreadDoc = currentThreadSnap.docs[0];
      const currentThreadData = currentThreadDoc?.data() as DirectMessageThread | undefined;
      
      // Update unread counts and reset typing indicators
      if (currentThreadData?.participantIds) {
        // Create a batch to update the thread
        const batch = writeBatch(db);
        
        // Update unread counts
        const unreadCountsUpdate: Record<string, any> = {
          [`unreadCounts.${currentUser.id}`]: 0,
          updatedAt: serverTimestamp()
        };
        
        // Increment unread count for other participants
        currentThreadData.participantIds.forEach(participantId => {
          if (participantId !== currentUser.id) {
            unreadCountsUpdate[`unreadCounts.${participantId}`] = increment(1);
          }
        });
        
        batch.update(threadRef, unreadCountsUpdate);
        
        // Remove typing indicators if they exist
        if (currentThreadData?.typingUsers) {
          const typingIndicatorToRemoveTrue: TypingIndicator = { 
            userId: currentUser.id, 
            fullName: currentUser.fullName || 'User', 
            isTyping: true 
          };
          const typingIndicatorToRemoveFalse: TypingIndicator = { 
            userId: currentUser.id, 
            fullName: currentUser.fullName || 'User', 
            isTyping: false 
          };
          
          batch.update(threadRef, {
            typingUsers: arrayRemove(typingIndicatorToRemoveTrue),
            updatedAt: serverTimestamp()
          });
          
          batch.update(threadRef, {
            typingUsers: arrayRemove(typingIndicatorToRemoveFalse),
            updatedAt: serverTimestamp()
          });
        }
        
        await batch.commit();
      }
      
      // Reset typing state
      lastSentTypingStateRef.current = false;

    } catch (e: any) {
      console.error("Error sending message:", e);
      setErrorMessages(`Failed to send message: ${e.message}`);
    }
  }, [threadId, currentUser, authLoading]);


  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!threadId || !currentUser?.id || authLoading || lastSentTypingStateRef.current === isTyping) {
      return;
    }

    const threadRef = doc(db, 'dmThreads', threadId);
    try {
      const indicator: TypingIndicator = {
        userId: currentUser.id,
        fullName: currentUser.fullName || 'User',
        isTyping: isTyping
      };
      
      const currentThreadSnap = await getDocs(query(collection(db, 'dmThreads'), where('__name__', '==', threadId), limit(1)));
      const currentThreadDoc = currentThreadSnap.docs[0];
      const currentThreadData = currentThreadDoc?.data() as DirectMessageThread | undefined;

      // Only update if typingUsers field exists or if adding the first typing user.
      if (isTyping) {
        if (currentThreadData?.typingUsers) {
            await updateDoc(threadRef, { 
                // Remove the other state first, then add the new one
                typingUsers: arrayRemove({ userId: currentUser.id, fullName: currentUser.fullName || 'User', isTyping: !isTyping }),
                // Include updatedAt field to comply with security rules
                updatedAt: serverTimestamp()
            });
        }
        await updateDoc(threadRef, { 
            typingUsers: arrayUnion(indicator),
            // Include updatedAt field to comply with security rules
            updatedAt: serverTimestamp()
        });
      } else {
        if (currentThreadData?.typingUsers) { // Only try to remove if the field exists
            await updateDoc(threadRef, { 
                typingUsers: arrayRemove(indicator),
                // Include updatedAt field to comply with security rules
                updatedAt: serverTimestamp()
            });
        }
      }
      lastSentTypingStateRef.current = isTyping;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          if(lastSentTypingStateRef.current) { // Check if still should send false
            sendTypingIndicator(false);
          }
        }, TYPING_TIMEOUT_MS);
      }
    } catch (e: any) {
      console.error("Error sending typing indicator:", e);
    }
  }, [threadId, currentUser, authLoading]);

   const markMessagesAsRead = useCallback(async () => {
    if (!threadId || !currentUser?.id || messages.length === 0 || authLoading) {
      return;
    }

    const threadRef = doc(db, 'dmThreads', threadId);
    const threadSnap = await getDocs(query(collection(db, 'dmThreads'), where('__name__', '==', threadId), limit(1)));
    if (threadSnap.empty) return;

    const threadDoc = threadSnap.docs[0];
    const threadData = threadDoc.data() as DirectMessageThread;
    const unreadCountForCurrentUser = threadData.unreadCounts?.[currentUser.id] || 0;
    
    if (unreadCountForCurrentUser === 0 && messages.every(msg => msg.senderId === currentUser.id || (msg.isReadBy && msg.isReadBy.includes(currentUser.id)))) {
        return; // No unread messages for current user based on thread summary and detailed check
    }
    
    const batch = writeBatch(db);
    const messagesRef = collection(db, 'dmThreads', threadId, 'directMessages');
    const unreadMessagesQuery = query(messagesRef, where('senderId', '!=', currentUser.id));
    const unreadMessagesSnap = await getDocs(unreadMessagesQuery);

    let messagesToMarkAsRead = 0;
    unreadMessagesSnap.forEach((messageDoc) => {
      const messageRef = doc(messagesRef, messageDoc.id);
      batch.update(messageRef, { isRead: true });
      messagesToMarkAsRead++;
    });
    
    if (unreadCountForCurrentUser > 0 || messagesToMarkAsRead > 0) {
      batch.update(threadRef, { 
        [`unreadCounts.${currentUser.id}`]: 0,
        // Include updatedAt field to comply with security rules
        updatedAt: serverTimestamp()
      });
    }
    
    try {
      await batch.commit();
    } catch (e: any) {
      console.error("Error marking messages as read:", e);
    }
    
    return;
  }, [threadId, currentUser, messages, authLoading]);

  useEffect(() => {
    if (threadId && currentUser?.id && messages.length > 0 && document.visibilityState === 'visible') {
         const timer = setTimeout(() => markMessagesAsRead(), 1000); // Delay slightly to avoid rapid updates
         return () => clearTimeout(timer);
    }
  }, [threadId, currentUser?.id, messages, markMessagesAsRead]);

  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && threadId && currentUser?.id && messages.length > 0) {
            markMessagesAsRead();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [threadId, currentUser?.id, messages, markMessagesAsRead]);


  return {
    messages,
    loadingMessages,
    errorMessages,
    sendMessage,
    sendTypingIndicator,
    typingUsers,
    markMessagesAsRead,
  };
}
