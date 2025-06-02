'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  DocumentSnapshot, 
  Timestamp,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  Query,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, isToday, isTomorrow, isThisWeek, addWeeks } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Loader2,
  DollarSign,
  Info,
} from 'lucide-react'; 

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Battle, BattleStatus, BattleMode } from '@/types';
import { useInView } from 'react-intersection-observer';
import BattleCard from '@/components/battles/battle-card'; // Import the BattleCard component

// Constants
const BATCH_SIZE = 10;

type BattleStatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

// Status configuration for battle cards
const BATTLE_STATUS: Record<BattleStatus, { label: string; variant: BattleStatusVariant }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'default' },
  declined: { label: 'Declined', variant: 'destructive' },
  ongoing: { label: 'Ongoing', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' }
};

// Helper functions
const formatBattleDate = (date: Date | Timestamp): string => {
  const dateObj = date instanceof Timestamp ? date.toDate() : date;
  if (isToday(dateObj)) return 'Today';
  if (isTomorrow(dateObj)) return 'Tomorrow';
  if (isThisWeek(dateObj, { weekStartsOn: 1 })) return format(dateObj, 'EEEE');
  return format(dateObj, 'MMM d, yyyy');
};

const formatBattleTime = (date: Date | Timestamp): string => {
  const dateObj = date instanceof Timestamp ? date.toDate() : date;
  return format(dateObj, 'h:mm a');
};

// Process battle document from Firestore
const processBattleDoc = (doc: QueryDocumentSnapshot<DocumentData>): Battle => {
  const data = doc.data();
  return {
    id: doc.id,
    battleId: doc.id,
    creatorAId: data.creatorAId || '',
    creatorBId: data.creatorBId || '',
    creatorAName: data.creatorAName || 'Unknown',
    creatorBName: data.creatorBName || 'Unknown',
    creatorAAvatar: data.creatorAAvatar || '',
    creatorBAvatar: data.creatorBAvatar || '',    // Ensure dateTime is always a Timestamp
    dateTime: (data.dateTime instanceof Timestamp && data.dateTime)
      ? data.dateTime
      : (data.scheduledTime instanceof Timestamp && data.scheduledTime)
        ? data.scheduledTime
        : Timestamp.now(),
    status: (data.status as BattleStatus) || 'pending',
    mode: (data.mode as BattleMode) || 'Standard',
    participants: data.participants || [],
    winnerId: data.winnerId || undefined,
    prize: data.prize || 0,
    currency: data.currency || 'USD',
    rules: data.rules || [],
    judges: data.judges || [],
    title: data.title || 'Untitled Battle',
    description: data.description || '',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date()
  };
};

export default function BattlesCalendarView() {
  const [upcomingBattles, setUpcomingBattles] = useState<Battle[]>([]);
  const [allBattles, setAllBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
  });
  
  const isMounted = useRef(true);
  const unsubscribeUpcoming = useRef<Unsubscribe | null>(null);
  const unsubscribeAll = useRef<Unsubscribe | null>(null);
  
  const battlesRef = collection(db, 'battles');
  
  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const nextWeek = addWeeks(now, 1);
      
      // Query for upcoming battles (next 7 days)
      const upcomingQuery = query(
        battlesRef,
 where('status', '==', 'accepted'),
        where('dateTime', '>=', now),
        where('dateTime', '<=', nextWeek),
        orderBy('dateTime', 'asc')
      ) as Query<DocumentData, DocumentData>;
      
      // Query for all battles (paginated)
      const allQuery = query(
        battlesRef,
        orderBy('dateTime', 'desc'),
        limit(BATCH_SIZE)
      ) as Query<DocumentData, DocumentData>;
      
      const [upcomingSnapshot, allSnapshot] = await Promise.all([
        getDocs(upcomingQuery),
        getDocs(allQuery)
      ]);
      
      if (!isMounted.current) return;
      
      const upcoming = upcomingSnapshot.docs.map(doc => processBattleDoc(doc as QueryDocumentSnapshot<DocumentData>));
      const all = allSnapshot.docs.map(doc => processBattleDoc(doc as QueryDocumentSnapshot<DocumentData>));
      
      setUpcomingBattles(upcoming);
      setAllBattles(all);
      setLastVisible(allSnapshot.docs[allSnapshot.docs.length - 1]);
      setHasMore(allSnapshot.docs.length === BATCH_SIZE);
    } catch (err) {
      console.error('Error loading battles:', err);
      setError('Failed to load battles. Please try again later.');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);
  
  // Set up real-time listeners
  const setupListeners = useCallback(() => {
    try {
      // Set up listener for upcoming battles
      const upcomingQuery = query(
        battlesRef,
 where('status', '==', 'accepted'),
        where('dateTime', '>=', new Date()),
        orderBy('dateTime', 'asc')
      );
      
      unsubscribeUpcoming.current = onSnapshot(
        upcomingQuery,
        (snapshot) => {
          const battles = snapshot.docs.map(doc => processBattleDoc(doc as QueryDocumentSnapshot<DocumentData>));
          if (isMounted.current) {
            setUpcomingBattles(battles);
          }
        },
        (err) => {
          console.error('Error in upcoming battles listener:', err);
          if (isMounted.current) {
            setError('Error receiving updates for upcoming battles');
          }
        }
      );
      
      // Set up listener for all battles
      const allQuery = query(
        battlesRef,
 where('status', '==', 'accepted'),
        orderBy('dateTime', 'desc'),
        limit(BATCH_SIZE)
      );
      
      unsubscribeAll.current = onSnapshot(
        allQuery,
        (snapshot) => {
          const battles = snapshot.docs.map(doc => processBattleDoc(doc as QueryDocumentSnapshot<DocumentData>));
          if (isMounted.current) {
            setAllBattles(battles);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === BATCH_SIZE);
          }
        },
        (err) => {
          console.error('Error in all battles listener:', err);
          if (isMounted.current) {
            setError('Error receiving updates for battles');
          }
        }
      );
    } catch (err) {
      console.error('Error setting up listeners:', err);
      setError('Failed to set up real-time updates');
    }
  }, []);
  
  // Load more battles for pagination
  const loadMoreBattles = useCallback(async () => {
    if (!lastVisible || !hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      const nextQuery = query(
        battlesRef,
        orderBy('dateTime', 'desc'),
        startAfter(lastVisible),
        limit(BATCH_SIZE)
      );
      
      const snapshot = await getDocs(nextQuery);
      const newBattles = snapshot.docs.map(doc => processBattleDoc(doc as QueryDocumentSnapshot<DocumentData>));
      
      if (isMounted.current) {
        setAllBattles(prev => [...prev, ...newBattles]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
      }
    } catch (err) {
      console.error('Error loading more battles:', err);
      setError('Failed to load more battles');
    } finally {
      if (isMounted.current) {
        setLoadingMore(false);
      }
    }
  }, [lastVisible, hasMore, loadingMore]);
  
  // Initialize component
  useEffect(() => {
    isMounted.current = true;
    
    const initialize = async () => {
      try {
        await loadInitialData();
        setupListeners();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize battles');
      }
    };
    
    initialize();
    
    return () => {
      isMounted.current = false;
      if (unsubscribeUpcoming.current) {
        unsubscribeUpcoming.current();
      }
      if (unsubscribeAll.current) {
        unsubscribeAll.current();
      }
    };
  }, [loadInitialData, setupListeners]);
  
  // Handle infinite scroll
  useEffect(() => {
    if (inView && !loading && !loadingMore && hasMore) {
      loadMoreBattles();
    }
  }, [inView, loading, loadingMore, hasMore, loadMoreBattles]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading battles...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => {
            setError(null);
            loadInitialData();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Upcoming Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Upcoming Battles</h2>
        {upcomingBattles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingBattles.map(battle => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/50 rounded-lg">
            <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No upcoming battles scheduled</p>
          </div>
        )}
      </section>
      
      {/* All Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Battles</h2>
        <div className="space-y-4">
          {allBattles.length > 0 ? (
            <>
              {allBattles.map(battle => (
                <BattleCard key={battle.id} battle={battle} />
              ))}
              {loadingMore && (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              <div ref={loadMoreRef} className="h-1" />
              {!hasMore && allBattles.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  You've reached the end of the list
                </p>
              )}
            </>
          ) : (
            <div className="text-center p-8 bg-muted/50 rounded-lg">
              <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No battles found</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
