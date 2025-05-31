import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Battle, UserProfile } from '@/types';

export function useBattles() {
  const [openBattles, setOpenBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const battlesRef = collection(db, 'battles');
    const openBattlesQuery = query(
      battlesRef,
      where('status', '==', 'pending'),
      where('requestType', '==', 'Open')
    );

    const unsubscribe = onSnapshot(
      openBattlesQuery,
      (snapshot) => {
        try {
          const battles = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              creatorA: data.creatorAProfile as UserProfile,
              creatorB: data.creatorBProfile as UserProfile,
              dateTime: (data.dateTime as Timestamp).toDate(),
              mode: data.mode,
              status: data.status,
              requestedBy: data.requestedBy,
              requestType: data.requestType,
              createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
            } as Battle;
          });
          setOpenBattles(battles);
          setIsLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing battles:', err);
          setError('Failed to load battles. Please try again.');
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching battles:', err);
        setError('Failed to load battles. Please try again.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { openBattles, isLoading, error };
}
