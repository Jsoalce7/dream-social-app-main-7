'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc, doc as firestoreDoc,
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

const BATCH_SIZE = 10; // Define a batch size for pagination

export function useBattleRequests(): UseBattleRequestsResult {
  const { user: currentUser } = useAuth();
  const [battleRequests, setBattleRequests] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchBattleRequests = useCallback(async (loadMore = false) => {
    const userId = currentUser?.id;
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('🐛 useBattleRequests: Current User ID:', userId);

    // First, try with the composite index query
    try {
      let q = query(
        collection(db, 'battleRequests'),
        where('status', '==', 'pending'),
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc'), // Assuming you have a createdAt field for ordering
        firestoreLimit(BATCH_SIZE)
      );

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('ℹ️ useBattleRequests: Composite index query returned empty snapshot.');
        if (loadMore) {
          setHasMore(false);
        } else {
          setBattleRequests([]);
        }
        setIsLoading(false);
        return;
      }

      console.log(`🐛 useBattleRequests: Composite index query returned ${querySnapshot.size} documents.`);
      
      // Log raw data before any processing
      console.log('📋 Raw battle requests (before processing):', 
        querySnapshot.docs.map(doc => ({
          id: doc.id, 
          ...doc.data(),
          // Convert Firestore timestamp to string for better readability
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString()
        }))
      );

      // Fetch related battle documents to get the dateTime and other details
      const battleDocPromises = querySnapshot.docs.map(async doc => {
        const data = doc.data();
        console.log('🐛 useBattleRequests: Processing battleRequest document:', doc.id, 'with receiverId:', data.receiverId);
        
        try {
          if (!data.battleId) {
            console.warn('⚠️ Battle request is missing battleId:', doc.id);
            return { doc, battleData: null, error: 'Missing battleId' };
          }
          
          const battleDoc = await getDoc(firestoreDoc(db, 'battles', data.battleId));
          if (!battleDoc.exists()) {
            console.warn('⚠️ Battle document not found for battleId:', data.battleId);
            return { doc, battleData: null, error: 'Battle not found' };
          }
          
          return { doc, battleData: battleDoc.data(), error: null };
        } catch (error) {
          console.error('❌ Error fetching battle document:', error);
          return { doc, battleData: null, error: error instanceof Error ? error.message : String(error) };
        }
      });

      const battleResults = await Promise.all(battleDocPromises);

      // Log all battle results for debugging
      console.log('🔍 Battle document fetch results:', battleResults.map(({ doc, battleData: bd, error }) => ({
        id: doc.id,
        hasBattleData: !!bd,
        error: error || null,
        battleFields: bd ? Object.keys(bd) : []
      })));

      const newBattles = battleResults
        .map(({ doc, battleData: battleDataResult, error }) => {
          const requestData = doc.data();
          const docId = doc.id;
          
          // Log the raw request data for debugging
          console.log(`📝 Processing battle request ${docId}:`, {
            ...requestData,
            createdAt: requestData.createdAt?.toDate?.()?.toISOString()
          });
          
          // Check required fields
          const requiredFields = {
            senderId: !!requestData.senderId,
            receiverId: !!requestData.receiverId,
            status: !!requestData.status,
            battleId: !!requestData.battleId
          };
          
          const hasAllRequiredFields = Object.values(requiredFields).every(Boolean);
          
          if (!hasAllRequiredFields) {
            console.warn('⚠️ Skipping battle request - missing required fields:', {
              docId,
              missingFields: Object.entries(requiredFields)
                .filter(([_, hasField]) => !hasField)
                .map(([field]) => field),
              requestData: {
                ...requestData,
                createdAt: requestData.createdAt?.toDate?.()?.toISOString()
              }
            });
            return null;
          }
          
          // Process valid battle request
          try {
            const battleData = battleDataResult || {};
            
            // Log battle data for debugging
            console.log(`🏆 Battle data for ${docId}:`, {
              hasBattleData: !!battleDataResult,
              battleFields: battleData ? Object.keys(battleData) : []
            });

            // Build the battle object
            const battle: Battle = {
              id: docId,
              battleId: requestData.battleId,
              senderId: requestData.senderId,
              senderName: requestData.senderName || 'Unknown Sender',
              receiverId: requestData.receiverId,
              receiverName: requestData.receiverName || 'Unknown Receiver',
              creatorAName: requestData.senderName || 'Unknown Sender',
              creatorBName: requestData.receiverName || 'Unknown Receiver',
              creatorAAvatar: requestData.senderAvatar || '',
              creatorBAvatar: requestData.receiverAvatar || '',
              mode: requestData.mode || 'versus',
              status: requestData.status,
              creatorAId: requestData.creatorAId || requestData.senderId,
              creatorBId: requestData.creatorBId || requestData.receiverId,
              createdAt: requestData.createdAt?.toDate?.() || new Date(),
              // Merge battle-specific data if available
              ...battleData,
              // Ensure dateTime is a Date object if it exists
              dateTime: battleData?.dateTime?.toDate?.() || null
            } as Battle;

            console.log(`✅ Successfully processed battle request ${docId}`, battle);
            return battle;
            
          } catch (error) {
            console.error(`❌ Error processing battle request ${docId}:`, error);
            return null;
          }
        })
        .filter((battle): battle is Battle => battle !== null);

      // Log the final processed battles
      console.log('🏁 Processed battles:', {
        count: newBattles.length,
        battles: newBattles.map(b => ({
          id: b.id,
          battleId: b.battleId,
          senderId: b.senderId,
          receiverId: b.receiverId,
          status: b.status
        }))
      });

      setBattleRequests(newBattles);

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      setHasMore(querySnapshot.docs.length === BATCH_SIZE);

      return newBattles;

    } catch (err: any) {
      console.warn('⚠️ useBattleRequests: Composite index query failed, falling back to client-side filtering:', err);
      // If the composite index query fails, fall back to a simpler query
      // This might happen if the index is not created yet in Firestore
      try {
        let q = query(
          collection(db, 'battleRequests'),
          where('receiverId', '==', userId),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'), // Assuming you have a createdAt field for ordering
          firestoreLimit(BATCH_SIZE)
        );

        if (loadMore && lastVisible) {
          q = query(q, startAfter(lastVisible));
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log('ℹ️ useBattleRequests: Fallback query returned empty snapshot.');
          if (loadMore) {
            setHasMore(false);
          } else {
            setBattleRequests([]);
          }
          setIsLoading(false);
          return;
        }

         console.log(`🐛 useBattleRequests: Fallback query returned ${querySnapshot.size} documents.`);

         // Fetch related battle documents to get the dateTime and other details
        const battleDocPromises = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('🐛 useBattleRequests: Processing battleRequest document in fallback:', doc.id, 'with receiverId:', data.receiverId);
          return getDoc(firestoreDoc(db, 'battles', data.battleId));
        });

        const battleDocs = await Promise.all(battleDocPromises);

        const newBattles: Battle[] = querySnapshot.docs
          .map((doc, index) => {
            const requestData = doc.data();
            const battleDoc = battleDocs[index];
            let battleData: any = {};
            
            // Only check for required fields
            if (!requestData.senderId || !requestData.receiverId || !requestData.status) {
              console.warn('Skipping battle request with missing required fields:', doc.id, requestData);
              return null;
            }
            
            if (battleDoc && battleDoc.exists()) {
              battleData = battleDoc.data();
            }

            return {
              id: doc.id,
              battleId: requestData.battleId,
              senderId: requestData.senderId,
              senderName: requestData.senderName,
              receiverId: requestData.receiverId,
              receiverName: requestData.receiverName,
              creatorAId: requestData.creatorAId,
              creatorBId: requestData.creatorBId,
              status: requestData.status,
              createdAt: requestData.createdAt?.toDate(), // Optional field
              // Merge battle details
              ...battleData,
              dateTime: battleData?.dateTime?.toDate(), // Use dateTime from battles collection
            };
          })
          .filter((battle): battle is Battle => battle !== null);
          
        console.log('✅ Final battleRequests array (fallback):', newBattles);

        if (loadMore) {
          setBattleRequests(prev => [...prev, ...newBattles]);
        } else {
          setBattleRequests(newBattles);
        }

        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);
        setHasMore(querySnapshot.docs.length === BATCH_SIZE);

      } catch (fallbackErr: any) {
        console.error('❌ useBattleRequests: Both composite index and fallback queries failed:', fallbackErr);
        setError('Failed to fetch battle requests.');
        setBattleRequests([]); // Clear requests on error
      }
    }
    setIsLoading(false);
  }, [lastVisible]); // Removed currentUser from deps

  const acceptBattle = useCallback(async (battleId: string) => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      const requestRef = firestoreDoc(db, 'battleRequests', battleId);
      const battleRef = firestoreDoc(db, 'battles', battleId);
      batch.update(requestRef, { status: 'accepted' });
      // Uncomment and modify the following line if you want to update the battle status
      // batch.update(battleRef, { status: 'scheduled' });

      await batch.commit();
      console.log('✅ Battle request accepted:', battleId);
    } catch (err: any) {
      console.error('❌ Error accepting battle request:', err);
      setError('Failed to accept battle request.');
    }
  }, [currentUser]);

  const declineBattle = useCallback(async (battleId: string) => {
    if (!currentUser) return;
    try {
      const requestRef = firestoreDoc(db, 'battleRequests', battleId);
      await updateDoc(requestRef, { status: 'declined' });
      console.log('✅ Battle request declined:', battleId);
    } catch (err: any) {
      console.error('❌ Error declining battle request:', err);
      setError('Failed to decline battle request.');
    }
  }, [currentUser]);

  const loadMoreBattles = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchBattleRequests(true);
  }, [hasMore, isLoading, fetchBattleRequests]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'battleRequests'),
      where('receiverId', '==', currentUser.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📡 useBattleRequests (unreadCount): Received snapshot update. Size:', snapshot.size);
        setUnreadCount(snapshot.size);
      },
      (err) => {
        console.error('❌ useBattleRequests (unreadCount): Error listening for unread count:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchBattleRequests();
    }
  }, [currentUser?.id, fetchBattleRequests]);

  useEffect(() => {
    if (battleRequests.length > 0) {
      console.log('🎯 Final battleRequests state:', {
        count: battleRequests.length,
        ids: battleRequests.map(r => r.id),
        requests: battleRequests.map(r => ({
          id: r.id,
          battleId: r.battleId,
          senderId: r.senderId,
          receiverId: r.receiverId,
          status: r.status,
          hasBattleData: !!r.dateTime
        }))
      });
    } else {
      console.log('ℹ️ battleRequests state is empty');
    }
  }, [battleRequests]);

  return {
    battleRequests,
    isLoading,
    error,
    acceptBattle,
    declineBattle,
    loadMoreBattles,
    hasMore,
    onAccept: acceptBattle,
    onDecline: declineBattle,
    unreadCount,
  };
};

export default useBattleRequests;