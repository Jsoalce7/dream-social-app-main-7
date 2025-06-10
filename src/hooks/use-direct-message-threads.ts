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
      }
      return;
    }

    setLoadingThreads(true);
    const threadsRef = collection(db, 'dmThreads');
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
      // Import the utility function that strictly follows the security rules
      const { createDirectMessageThread } = await import('@/lib/direct-message-utils');
      
      // Use the utility function to create the thread
      const threadId = await createDirectMessageThread(currentUser, otherUser);
      
      // Set the selected thread ID and update the UI
      setSelectedThreadId(threadId);
      
      // Get the thread data to update the local state
      const threadRef = doc(db, 'dmThreads', threadId);
      const threadSnap = await getDoc(threadRef);
      
      if (threadSnap.exists()) {
        // Optimistic update for the local state
        setThreads(prevThreads => {
          const threadData = threadSnap.data() as DirectMessageThread;
          const optimisticThread: DirectMessageThread = {
            id: threadId,
            participantIds: threadData.participantIds,
            participantProfiles: threadData.participantProfiles,
            lastMessage: null,
            unreadCounts: threadData.unreadCounts,
            typingUsers: [],
            createdAt: threadData.createdAt, 
            updatedAt: threadData.updatedAt,
          };
          const filtered = prevThreads.filter(t => t.id !== optimisticThread.id);
          return [optimisticThread, ...filtered].sort((a,b) => {
            const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : 0;
            const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : 0;
            return timeB - timeA;
          });
        });
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
