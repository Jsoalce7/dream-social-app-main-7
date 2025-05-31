import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { UserProfile, DirectMessageThread, DirectMessage } from '@/types';

export function getThreadId(uid1: string, uid2: string): string {
  const u1 = String(uid1);
  const u2 = String(uid2);
  return u1 < u2 ? `${u1}_${u2}` : `${u2}_${u1}`;
}

export interface UseDirectMessageThreadsResult {
  threads: DirectMessageThread[];
  loadingThreads: boolean;
  error: string | null;
  selectedThreadId: string | null;
  selectThread: (threadId: string | null) => void;
  findOrCreateThreadWithUser: (otherUser: UserProfile) => Promise<string | null>;
}

export function useDirectMessageThreads(): UseDirectMessageThreadsResult {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [threads, setThreads] = useState<DirectMessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !currentUser?.id) {
      setLoadingThreads(false);
      setThreads([]);
      if (!authLoading && !currentUser?.id) {
         // console.log("useDirectMessageThreads: User not authenticated, clearing threads.");
      }
      return;
    }

    setLoadingThreads(true);
    const threadsRef = collection(db, 'dmThreads');
    console.log("currentUser.id from useAuth():", currentUser?.id);
    // The query needs to match the security rules which check if the user is a participant
    // Using array-contains ensures we only get threads where the current user is a participant
    const q = query(
      threadsRef,
      where('participantIds', 'array-contains', currentUser.id),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedThreads: DirectMessageThread[] = [];
      snapshot.forEach((doc) => {
        const threadData = { id: doc.id, ...doc.data() } as DirectMessageThread;
        const otherParticipantId = threadData.participantIds.find(id => id !== currentUser.id);
        if (otherParticipantId) {
            if (currentUser.blockedUsers?.includes(otherParticipantId)) {
                return; 
            }
        }
        fetchedThreads.push(threadData);
      });
      setThreads(fetchedThreads);
      setLoadingThreads(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching direct message threads:", err);
      setError(`Failed to fetch threads: ${err.message}`);
      setLoadingThreads(false);
    });

    return () => unsubscribe();
  }, [currentUser, authLoading]);

  const selectThread = useCallback((threadId: string | null) => {
    setSelectedThreadId(threadId);
  }, []);

  const findOrCreateThreadWithUser = useCallback(async (otherUser: UserProfile): Promise<string | null> => {
    if (!currentUser) {
      setError("You must be logged in to create a thread");
      throw new Error("You must be logged in to create a thread");
    }

    if (!otherUser?.id || currentUser.id === otherUser.id) {
      setError("Invalid user selected for messaging");
      return null;
    }

    setLoadingThreads(true);
    try {
      // Generate the thread ID - ensure consistent ordering
      // This MUST match the getThreadId function in the security rules
      const uid1 = String(currentUser.id);
      const uid2 = String(otherUser.id);
      
      // Security rules expect the IDs to be ordered lexicographically
      const threadId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
      
      // The participantIds array MUST match the order used in the thread ID
      const participantIds = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];

      console.log("🔍 Checking for thread with ID:", threadId);
      console.log("🔍 Current user ID:", uid1);
      console.log("🔍 Other user ID:", uid2);
      console.log("🔍 Participant IDs (ordered):", participantIds);

      // Check if thread already exists
      const threadRef = doc(db, 'dmThreads', threadId);
      const threadSnap = await getDoc(threadRef);

      if (threadSnap.exists()) {
        // Thread exists, return its ID
        console.log("✅ Thread already exists with ID:", threadId);
        setSelectedThreadId(threadId);
        setLoadingThreads(false);
        setError(null);
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
      // The security rules check for these specific fields
      const newThreadDataObject = {
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

      // Add console logs before writing to Firestore
      console.log("✅ Object.keys(newThreadDataObject):", Object.keys(newThreadDataObject));
      console.log("✅ New thread payload:", JSON.stringify(newThreadDataObject, (key, value) => {
        // Handle serverTimestamp() which doesn't stringify well
        if (value && typeof value === 'object' && value.constructor.name === 'FieldValue') {
          return 'serverTimestamp()';
        }
        return value;
      }, 2));
      console.log("✅ Thread ID:", threadId);

      console.log("⚠️ About to create thread with ID:", threadId);
      try {
        await setDoc(threadRef, newThreadDataObject);
        console.log("✅ Thread created successfully!");
        setSelectedThreadId(threadId);
        
        // Optimistic update for the local state
        setThreads(prevThreads => {
          const optimisticThread: DirectMessageThread = {
            id: threadId,
            participantIds: newThreadDataObject.participantIds,
            participantProfiles: newThreadDataObject.participantProfiles,
            lastMessage: null,
            unreadCounts: newThreadDataObject.unreadCounts,
            typingUsers: [],
            createdAt: Timestamp.now(), 
            updatedAt: Timestamp.now(),
          };
          const filtered = prevThreads.filter(t => t.id !== optimisticThread.id);
          return [optimisticThread, ...filtered].sort((a,b) => {
            const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : 0;
            const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : 0;
            return timeB - timeA;
          });
        });
      } catch (error) {
        console.error("❌ Error creating thread:", error);
        throw error; // Re-throw to be caught by the outer try/catch
      }
      
      setLoadingThreads(false);
      setError(null);
      return threadId;
    } catch (error) {
      console.error("Error in findOrCreateThreadWithUser:", error);
      setError(error instanceof Error ? error.message : String(error));
      setLoadingThreads(false);
      return null;
    }
  }, [currentUser, setError, setLoadingThreads, setSelectedThreadId, setThreads]);

  return {
    threads,
    loadingThreads,
    error,
    selectedThreadId,
    selectThread,
    findOrCreateThreadWithUser
  };
}
