'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  onSnapshot,
  orderBy,
  limit,
  limit as firestoreLimit,
  startAfter,
  getDoc,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { Battle } from '@/types';

export interface UseBattleRequestsResult {
  battleRequests: Battle[];
  isLoading: boolean;
  error: string | null;
  acceptBattle: (battleId: string) => Promise<void>;
  declineBattle: (battleId: string) => Promise<void>;
  loadMoreBattles: () => Promise<void>;
  hasMore: boolean;
  // For compatibility with existing components
  onAccept?: (battleId: string) => Promise<void>;
  onDecline?: (battleId: string) => Promise<void>;
  unreadCount?: number;
}

export function useBattleRequests(): UseBattleRequestsResult {
  const { user: currentUser } = useAuth();
  const [battleRequests, setBattleRequests] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const BATCH_SIZE = 10;

  const fetchBattleRequests = useCallback(async (loadMore = false) => {
    if (!currentUser?.id) {
      setBattleRequests([]);
      setIsLoading(false);
      return;
    }

    try {
      if (!loadMore) {
        setIsLoading(true);
        setError(null);
      }

      // First, try with the composite index query
      try {
        let q = query(
          collection(db, 'battleRequests'),
          where('status', '==', 'pending'),
          where('receiverId', '==', currentUser.id),
          orderBy('dateTime', 'desc'),
          firestoreLimit(BATCH_SIZE)
        );

        if (loadMore && lastVisible) {
          q = query(q, startAfter(lastVisible));
        }

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          if (loadMore) {
            setHasMore(false);
          } else {
            setBattleRequests([]);
          }
          return;
        }


        const newBattles = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure all required fields are present
          return {
            id: doc.id,
            status: data.status || 'pending',
            creatorAId: data.creatorAId,
            creatorBId: data.creatorBId,
            creatorAName: data.creatorAName || 'Unknown User',
            creatorBName: data.creatorBName || 'Unknown User',
            creatorAAvatar: data.creatorAAvatar,
            creatorBAvatar: data.creatorBAvatar,
            dateTime: data.dateTime || new Date(),
            mode: data.mode || 'standard',
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
            ...data
          };
        }) as Battle[];

        if (loadMore) {
          setBattleRequests(prev => [...prev, ...newBattles]);
        } else {
          setBattleRequests(newBattles);
        }

        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);
        setHasMore(querySnapshot.docs.length === BATCH_SIZE);
      } catch (err) {
        console.warn('Composite index query failed, falling back to client-side filtering:', err);
        
        // Fallback to client-side filtering if the composite index is missing
        const q = query(
          collection(db, 'battleRequests'),
          where('receiverId', '==', currentUser.id),
          where('status', '==', 'pending'),
          firestoreLimit(BATCH_SIZE * 2)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setBattleRequests([]);
          return;
        }

        const newBattles = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            status: data.status || 'pending',
            creatorAId: data.senderId,
            creatorBId: data.receiverId,
            creatorAName: data.senderName || 'Unknown User',
            creatorBName: data.receiverName || 'Unknown User',
            creatorAAvatar: data.senderAvatar || '',
            creatorBAvatar: data.receiverAvatar || '',
            dateTime: data.dateTime || new Date(),
            mode: data.mode || 'standard',
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
            ...data
          };
        }) as Battle[];

        setBattleRequests(newBattles);
        setHasMore(newBattles.length === BATCH_SIZE);
      }
    } catch (err) {
      console.error('Error fetching battle requests:', err);
      setError('Failed to load battle requests. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, lastVisible]);

  // Debug function to log all battle requests
  const logAllBattleRequests = async () => {
    try {
      console.log('🔍 DEBUG: Fetching ALL battleRequests...');
      const allRequests = await getDocs(collection(db, 'battleRequests'));
      
      console.log(`🔍 DEBUG: Found ${allRequests.size} total battle requests`);
      
      allRequests.forEach(doc => {
        const data = doc.data();
        console.log(`📋 Document ${doc.id}:`, {
          status: data.status,
          receiverId: data.receiverId,
          dateTime: data.dateTime?.toDate?.(),
          dateTimeType: data.dateTime?.constructor?.name,
          currentUserId: currentUser?.id,
          matchesCurrentUser: data.receiverId === currentUser?.id,
          isPending: data.status === 'pending'
        });
      });
    } catch (err) {
      console.error('❌ DEBUG: Error fetching battleRequests:', err);
    }
  };

  useEffect(() => {
    console.log('🔍 useBattleRequests: Setting up effect');
    console.log('🔍 useBattleRequests: currentUser =', currentUser);
    console.log('🔍 useBattleRequests: currentUser?.id =', currentUser?.id, '(type:', typeof currentUser?.id + ')');
    
    // Log all battle requests for debugging
    logAllBattleRequests();
    
    if (!currentUser?.id) {
      console.log('⚠️ useBattleRequests: currentUser.id is undefined, skipping query setup');
      return;
    }

    console.log('🔍 useBattleRequests: Setting up query with params:', {
      collection: 'battleRequests',
      status: 'pending',
      receiverId: currentUser.id,
      orderBy: 'dateTime',
      limit: BATCH_SIZE
    });

    // Log the exact query being made
    const queryConstraints = [
      where('status', '==', 'pending'),
      where('receiverId', '==', currentUser.id),
      orderBy('dateTime', 'desc'),
      limit(BATCH_SIZE)
    ];
    
    console.log('🔍 DEBUG: Query constraints:', {
      status: 'pending',
      receiverId: currentUser.id,
      receiverIdType: typeof currentUser.id,
      orderBy: 'dateTime',
      orderDirection: 'desc',
      limit: BATCH_SIZE
    });
    
    const q = query(collection(db, 'battleRequests'), ...queryConstraints);

    console.log('🔍 useBattleRequests: Setting up onSnapshot listener...');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('📡 useBattleRequests: Received snapshot update', {
          timestamp: new Date().toISOString(),
          size: snapshot.size,
          empty: snapshot.empty,
          docChanges: snapshot.docChanges().length
        });

        if (snapshot.empty) {
          console.log('ℹ️ useBattleRequests: No documents found matching the query');
          setBattleRequests([]);
          return;
        }

        // Log each document's data and validate fields
        const processedBattles = snapshot.docs.map(doc => {
          const data = doc.data();
          const battle = {
            id: doc.id,
            status: data.status || 'pending',
            creatorAId: data.creatorAId || data.senderId,
            creatorBId: data.creatorBId || data.receiverId,
            creatorAName: data.creatorAName || data.senderName || 'Unknown User',
            creatorBName: data.creatorBName || data.receiverName || 'Unknown User',
            creatorAAvatar: data.creatorAAvatar || data.senderAvatar || '',
            creatorBAvatar: data.creatorBAvatar || data.receiverAvatar || '',
            dateTime: data.dateTime || new Date(),
            mode: data.mode || 'standard',
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
            ...data
          };

          // Log field validation
          console.log(`📄 Document ${doc.id}:`, {
            hasStatus: 'status' in data,
            status: data.status,
            hasReceiverId: 'receiverId' in data,
            receiverId: data.receiverId,
            hasDateTime: 'dateTime' in data,
            dateTime: data.dateTime?.toDate?.(),
            rawData: data
          });

          return battle;
        }) as Battle[];

        console.log(`✅ useBattleRequests: Processed ${processedBattles.length} battles`);
        setBattleRequests(processedBattles);
      },
      (error) => {
        console.error('❌ useBattleRequests: onSnapshot error:', {
          code: error.code,
          message: error.message,
          details: error
        });
        setError('Failed to load battle requests');
      }
    );

    // Cleanup function
    return () => {
      console.log('🧹 useBattleRequests: Cleaning up listener');
      unsubscribe();
    };
  }, [currentUser?.id]);

  const updateBattleStatus = useCallback(async (battleId: string, status: 'accepted' | 'declined') => {
    console.log(`🔄 updateBattleStatus: Starting for battle ${battleId} with status ${status}`);
    if (!currentUser?.id) {
      console.error('❌ updateBattleStatus: currentUser.id is undefined');
      return;
    }

    try {
      const battleRequestRef = doc(db, 'battleRequests', battleId);
      await updateDoc(battleRequestRef, {
        status,
        updatedAt: Timestamp.now()
      });

      // Also update the corresponding battle if it exists
      const battleDoc = await getDoc(battleRequestRef);
      const data = battleDoc.data();
      if (data?.battleId) {
        const actualBattleRef = doc(db, 'battles', data.battleId);
        const battleSnap = await getDoc(actualBattleRef);

        if (battleSnap.exists()) {
          await updateDoc(actualBattleRef, {
            status,
            updatedAt: Timestamp.now()
          });
        } else if (status === 'accepted') {
          await setDoc(actualBattleRef, {
            ...data,
            status,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }

      setBattleRequests(prev =>
        prev.map(battle =>
          battle.id === battleId
            ? { ...battle, status }
            : battle
        )
      );
    } catch (err) {
      console.error(`Error ${status} battle:`, err);
      throw new Error(`Failed to ${status} battle`);
    }
  }, [currentUser?.id]);

  const acceptBattle = useCallback(async (battleId: string) => {
    await updateBattleStatus(battleId, 'accepted');
  }, [updateBattleStatus]);

  const declineBattle = useCallback(async (battleId: string) => {
    await updateBattleStatus(battleId, 'declined');
  }, [updateBattleStatus]);

  const loadMoreBattles = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await fetchBattleRequests(true);
  }, [fetchBattleRequests, hasMore, isLoading]);

  return {
    battleRequests,
    isLoading,
    error,
    acceptBattle,
    declineBattle,
    onAccept: acceptBattle, // Alias for compatibility
    onDecline: declineBattle, // Alias for compatibility
    loadMoreBattles,
    hasMore,
    unreadCount: battleRequests.length, // Simple unread count
  };
}
