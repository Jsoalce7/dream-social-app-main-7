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
  limit as firestoreLimit,
  startAfter,
  getDoc,
  writeBatch
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
          collection(db, 'battles'),
          where('status', '==', 'pending'),
          where('creatorBId', '==', currentUser.id),
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
          collection(db, 'battles'),
          where('status', '==', 'pending'),
          where('creatorBId', '==', currentUser.id),
          firestoreLimit(BATCH_SIZE * 10) // Get more documents to account for client-side filtering
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setBattleRequests([]);
          return;
        }

        let battles = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Battle[];

        // Sort by dateTime on the client
        battles = battles
          .filter(battle => battle.status === 'pending')
          .sort((a, b) => (b.dateTime?.toDate?.()?.getTime() || 0) - (a.dateTime?.toDate?.()?.getTime() || 0))
          .slice(0, loadMore ? battleRequests.length + BATCH_SIZE : BATCH_SIZE);

        setBattleRequests(battles);
        setHasMore(battles.length === BATCH_SIZE);
      }
    } catch (err) {
      console.error('Error fetching battle requests:', err);
      setError('Failed to load battle requests. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, lastVisible]);

  useEffect(() => {
    fetchBattleRequests();
  }, [fetchBattleRequests]);

  const updateBattleStatus = useCallback(async (battleId: string, status: 'accepted' | 'declined') => {
    if (!currentUser?.id) return;

    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        status,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
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
