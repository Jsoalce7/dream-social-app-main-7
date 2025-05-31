'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow } from 'date-fns';
import { Swords, Calendar as CalendarIcon, Clock, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Battle, UserProfile, BattleMode, BattleStatus, BattleRequestType } from '@/types';

// Helper functions
const formatBattleDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'Date not set';
  const date = timestamp.toDate();
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMMM d, yyyy');
};

const formatBattleTime = (timestamp?: Timestamp) => {
  if (!timestamp) return 'Time not set';
  const date = timestamp.toDate();
  return format(date, 'h:mm a');
};

const processBattleDoc = (doc: DocumentSnapshot): Battle => {
  const data = doc.data();

  if (!data || !data.status || !data.mode || !data.dateTime || !data.creatorAId || !data.creatorBId) {
    console.warn(`Document ${doc.id} has missing critical data. Using fallback. Data:`, data);
    return {
      id: doc.id,
      creatorAId: data?.creatorAId || 'unknown_A_id',
      creatorBId: data?.creatorBId || 'unknown_B_id',
      dateTime: data?.dateTime || Timestamp.now(),
      status: (data?.status as BattleStatus) || 'pending',
      mode: (data?.mode as BattleMode) || 'Standard',
      title: data?.title || 'Battle Data Incomplete',
      creatorAName: data?.creatorAName || 'Player A (Error)',
      creatorAAvatar: data?.creatorAAvatar,
      creatorBName: data?.creatorBName || 'Player B (Error)',
      creatorBAvatar: data?.creatorBAvatar,
    };
  }

  return {
    id: doc.id,
    creatorAId: data.creatorAId,
    creatorAName: data.creatorAName,
    creatorAAvatar: data.creatorAAvatar,
    creatorBId: data.creatorBId,
    creatorBName: data.creatorBName,
    creatorBAvatar: data.creatorBAvatar,
    dateTime: data.dateTime as Timestamp,
    status: data.status as BattleStatus,
    mode: data.mode as BattleMode,
    title: data.title || undefined,
    requestedBy: data.requestedBy as string | undefined,
    requestType: data.requestType as BattleRequestType | undefined,
    createdAt: data.createdAt as Timestamp | undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
};

const BATTLE_STATUS_CONFIG: Record<BattleStatus, { label: string; variant: 'default' | 'outline' | 'destructive' | 'secondary'; icon?: React.ElementType }> = {
  accepted: { label: 'Accepted', variant: 'default' as const },
  pending: { label: 'Pending', variant: 'outline' as const },
  declined: { label: 'Declined', variant: 'destructive' as const },
  ongoing: { label: 'Ongoing', variant: 'secondary' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
};

const BATTLE_MODE_COLORS: Record<BattleMode, string> = {
  Standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Duet: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Team: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Tournament: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

interface BattleCardProps {
  battle: Battle;
}

function BattleCard({ battle }: BattleCardProps) {
  if (!battle || !battle.status || !BATTLE_STATUS_CONFIG[battle.status]) {
    return (
      <Card className="border-yellow-500 opacity-80 my-2">
        <CardContent className="p-4">
          <div className="flex items-center text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p className="text-sm">Battle data is incomplete or status is invalid.</p>
          </div>
          {battle && <p className="text-xs text-muted-foreground mt-1">ID: {battle.id}</p>}
        </CardContent>
      </Card>
    );
  }

  const statusInfo = BATTLE_STATUS_CONFIG[battle.status];

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-card-foreground my-2 w-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1 flex-grow min-w-0">
            <div className="flex items-center space-x-2 flex-wrap mb-1">
              <Badge
                variant={statusInfo.variant}
                className="capitalize py-1 px-2 text-xs font-semibold whitespace-nowrap"
              >
                {statusInfo.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn('capitalize py-1 px-2 text-xs font-semibold whitespace-nowrap', BATTLE_MODE_COLORS[battle.mode])}
              >
                {battle.mode}
              </Badge>
            </div>
            <p className="text-lg font-semibold text-primary truncate" title={battle.title || 'Unnamed Battle'}>
                {battle.title || 'Unnamed Battle'}
            </p>
            <div className="flex items-center text-sm text-muted-foreground flex-wrap">
              <CalendarIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="whitespace-nowrap mr-3">{formatBattleDate(battle.dateTime)}</span>
              <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{formatBattleTime(battle.dateTime)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t dark:border-gray-700">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-grow min-w-0">
            <div className="flex flex-col items-center text-center min-w-0 flex-1">
              <Avatar className="h-10 w-10 mb-1">
                <AvatarImage src={battle.creatorAAvatar} alt={battle.creatorAName || 'Player 1'} />
                <AvatarFallback>{battle.creatorAName ? battle.creatorAName.substring(0,1).toUpperCase() : 'A'}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate w-full px-1" title={battle.creatorAName || 'Player 1'}>{battle.creatorAName || 'Player 1'}</span>
            </div>
            <Swords className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mx-1 sm:mx-2" />
            <div className="flex flex-col items-center text-center min-w-0 flex-1">
              <Avatar className="h-10 w-10 mb-1">
                <AvatarImage src={battle.creatorBAvatar} alt={battle.creatorBName || 'Player 2'} />
                <AvatarFallback>{battle.creatorBName ? battle.creatorBName.substring(0,1).toUpperCase() : 'B'}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate w-full px-1" title={battle.creatorBName || 'Player 2'}>{battle.creatorBName || 'Player 2'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BattlesCalendarView() {
  const [upcomingBattles, setUpcomingBattles] = useState<Battle[]>([]);
  const [allBattles, setAllBattles] = useState<Battle[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const BATCH_SIZE = 6;

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Fetch upcoming battles
  useEffect(() => {
    setLoadingUpcoming(true);
    const now = Timestamp.now();
    const q = query(
      collection(db, 'battles'),
      where('dateTime', '>=', now),
      where('status', 'in', ['pending', 'accepted', 'ongoing']),
      orderBy('dateTime', 'asc'),
      firestoreLimit(3)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const battles = snapshot.docs.map(processBattleDoc);
        setUpcomingBattles(battles);
        setLoadingUpcoming(false);
      },
      (err) => {
        console.error('Error fetching upcoming battles:', err);
        setError((prevError) => prevError ? `${prevError}\nFailed to load upcoming battles` : 'Failed to load upcoming battles');
        setLoadingUpcoming(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch initial batch of battle history
  useEffect(() => {
    setLoadingHistory(true);
    setHasMore(true); // Reset on initial load
    setLastVisible(null); // Reset on initial load

    const q = query(
      collection(db, 'battles'),
      orderBy('dateTime', 'desc'),
      firestoreLimit(BATCH_SIZE)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const battles = snapshot.docs.map(processBattleDoc);
        setAllBattles(battles);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
        setLoadingHistory(false);
      },
      (err) => {
        console.error('Error fetching initial battle history:', err);
        setError((prevError) => prevError ? `${prevError}\nFailed to load battle history` : 'Failed to load battle history');
        setLoadingHistory(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadMoreBattles = useCallback(async () => {
    if (loadingMore || !hasMore || !lastVisible) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'battles'),
        orderBy('dateTime', 'desc'),
        startAfter(lastVisible),
        firestoreLimit(BATCH_SIZE)
      );
      const documentSnapshots = await getDocs(q);
      const newBattles = documentSnapshots.docs.map(processBattleDoc);
      
      setAllBattles((prevBattles) => [...prevBattles, ...newBattles]);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(newBattles.length === BATCH_SIZE);
    } catch (err) {
      console.error('Error loading more battles:', err);
      setError((prevError) => prevError ? `${prevError}\nFailed to load more battles` : 'Failed to load more battles');
      // Optionally set hasMore to false or handle error display
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastVisible, BATCH_SIZE]);

  useEffect(() => {
    if (inView && hasMore && !loadingMore && !loadingHistory) {
      loadMoreBattles();
    }
  }, [inView, hasMore, loadingMore, loadMoreBattles, loadingHistory]);

  if (loadingUpcoming && loadingHistory && allBattles.length === 0 && upcomingBattles.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading battles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Oops! Something went wrong.</h2>
        <p className="text-muted-foreground mb-4 whitespace-pre-line">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <section>
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b">Upcoming Battles</h2>
        {loadingUpcoming && upcomingBattles.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : upcomingBattles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-card p-6 rounded-lg shadow">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No upcoming battles scheduled.</p>
            <p className="text-sm text-muted-foreground/80 mt-1">Check back later or schedule a new one!</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b">Battle History</h2>
        {loadingHistory && allBattles.length === 0 ? (
           <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allBattles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-card p-6 rounded-lg shadow">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No battles found in your history.</p>
          </div>
        )}
        
        {/* Load More Trigger / Indicator */}
        {allBattles.length > 0 && (
          <div ref={loadMoreRef} className="flex justify-center items-center mt-6 py-4">
            {loadingMore ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : !hasMore ? (
              <p className="text-muted-foreground">You've reached the end of battle history.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
    };

    // Fetch Upcoming Battles (limited to 3, status 'accepted', future dateTime)
    const upcomingQuery = query(
      collection(db, 'battles'),
      where('status', '==', 'accepted'),
      where('dateTime', '>=', now),
      orderBy('dateTime', 'asc'),
      firestoreLimit(3)
    );

    const unsubscribeUpcoming = onSnapshot(
      upcomingQuery,
      (snapshot) => {
        const battles = snapshot.docs.map(processBattleDoc).filter(b => b.id !== 'error_A_id' && b.id !== 'error_B_id');
        setUpcomingBattles(battles);
        upcomingLoaded = true;
        checkCombinedLoading();
      },
      (err) => {
        console.error('Error fetching upcoming battles:', err);
        setError((prevError) => prevError ? `${prevError}\nFailed to load upcoming battles.` : 'Failed to load upcoming battles.');
        upcomingLoaded = true;
        checkCombinedLoading();
      }
    );

    // Fetch Initial Batch of All Battles (status accepted, ongoing, or completed, ordered by most recent)
    const initialAllBattlesQuery = query(
      collection(db, 'battles'),
      where('status', 'in', ['accepted', 'ongoing', 'completed']),
      orderBy('dateTime', 'desc'),
      firestoreLimit(BATCH_SIZE)
    );

    const unsubscribeAll = onSnapshot(
      initialAllBattlesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setAllBattles([]);
          setHasMore(false);
          setLastVisible(null);
        } else {
          const battles = snapshot.docs.map(processBattleDoc).filter(b => b.id !== 'error_A_id' && b.id !== 'error_B_id');
          setAllBattles(battles);
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === BATCH_SIZE);
        }
        allInitialLoaded = true;
        checkCombinedLoading();
      },
      (err) => {
        console.error('Error fetching initial all battles:', err);
        setError((prevError) => prevError ? `${prevError}\nFailed to load battle history.` : 'Failed to load battle history.');
        allInitialLoaded = true;
        checkCombinedLoading();
      }
    );

    return () => {
      unsubscribeUpcoming();
      unsubscribeAll();
    };
  }, []);

  const loadMoreBattles = useCallback(async () => {
    if (!lastVisible || loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    try {
      const nextQuery = query(
        collection(db, 'battles'),
        where('status', 'in', ['accepted', 'ongoing', 'completed']),
        orderBy('dateTime', 'desc'),
        startAfter(lastVisible),
        firestoreLimit(BATCH_SIZE)
      );

      const snapshot = await getDocs(nextQuery);
      if (snapshot.empty) {
        setHasMore(false);
        setLastVisible(null); // Explicitly set to null if no more docs
      } else {
        const newBattles = snapshot.docs.map(processBattleDoc).filter(b => b.id !== 'error_A_id' && b.id !== 'error_B_id');
        setAllBattles(prev => [...prev, ...newBattles]);
        const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastVisible(newLastVisible);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
      }
    } catch (err) {
      console.error('Error loading more battles:', err);
      setError((prevError) => prevError ? `${prevError}\nFailed to load more battles.` : 'Failed to load more battles.');
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisible, loadingMore, hasMore, loading, BATCH_SIZE]);

  useEffect(() => {
    if (inView && hasMore && !loadingMore && !loading) {
      loadMoreBattles();
    }
  }, [inView, hasMore, loadingMore, loading, loadMoreBattles]);

  if (loading && upcomingBattles.length === 0 && allBattles.length === 0) { // Only show full page loader on initial load
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg mt-4 text-muted-foreground">Loading battles...</p>
      </div>
    );
  }

  // Critical error display if nothing loaded
  if (error && upcomingBattles.length === 0 && allBattles.length === 0 && !loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">An Error Occurred</p>
        <pre className="mt-2 text-sm whitespace-pre-wrap bg-red-50 dark:bg-red-900/30 p-3 rounded-md text-destructive-foreground max-w-md">{error}</pre>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      {/* Non-critical error display if some data might be missing but some is loaded */}
      {error && (upcomingBattles.length > 0 || allBattles.length > 0) && !loading && (
         <div className="p-4 mb-6 text-sm text-yellow-800 bg-yellow-50 rounded-lg dark:bg-yellow-900/40 dark:text-yellow-300 flex items-center" role="alert">
            <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
            <div>
                <span className="font-medium">Notice:</span> Some battle data might be incomplete or unavailable. {error.split('\n').pop()?.trim()}
            </div>
        </div>
      )}

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-primary border-b dark:border-gray-700 pb-3">Upcoming Battles</h2>
        {loading && upcomingBattles.length === 0 ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading upcoming battles...</p>
            </div>
        ) : upcomingBattles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {upcomingBattles.map((battle) => (
              <BattleCard key={`upcoming-${battle.id}`} battle={battle} />
            ))} 
          </div>
        ) : (
          !error && <p className="text-muted-foreground italic py-4 text-center">No upcoming accepted battles scheduled.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-primary border-b dark:border-gray-700 pb-3">Battle History</h2>
        {loading && allBattles.length === 0 ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading battle history...</p>
            </div>
        ) : allBattles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {allBattles.map((battle) => (
              <BattleCard key={`all-${battle.id}`} battle={battle} />
            ))} 
          </div>
        ) : (
           !error && <p className="text-muted-foreground italic py-4 text-center">No battle history found.</p>
        )}
        
        <div ref={loadMoreRef} className="flex justify-center items-center mt-10 py-4 h-16">
          {loadingMore && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary mr-3" />
              <span>Loading more battles...</span>
            </div>
          )}
          {!loadingMore && hasMore && allBattles.length > 0 && (
            <p className="text-muted-foreground">Scroll down to load more.</p>
          )}
        </div>

        {!loadingMore && !hasMore && allBattles.length > 0 && (
           <p className="text-center mt-6 py-4 text-muted-foreground">You've reached the end of the battle list.</p>
        )}
        
        {!loading && !error && upcomingBattles.length === 0 && allBattles.length === 0 && (
             <p className="text-center mt-10 py-4 text-muted-foreground text-lg">No battles to display at the moment. Why not start one?</p>
        )}
      </section>
    </div>
  );
}

        console.error('Error fetching upcoming battles:', err);
        setError((prevError) => prevError ? `${prevError}\nFailed to load upcoming battles` : 'Failed to load upcoming battles');
        upcomingLoaded = true;
        checkCombinedLoading();
      }
    );

    const allBattlesQuery = query(
      collection(db, 'battles'),
      where('status', 'in', ['accepted', 'ongoing', 'completed']), // Broaden scope for 'all'
      orderBy('dateTime', 'desc'),
      firestoreLimit(BATCH_SIZE)
    );

    const unsubscribeAll = onSnapshot(
      allBattlesQuery,
      (snapshot) => {
        if (snapshot.empty) {
            setAllBattles([]);
            setHasMore(false);
        } else {
            const battles = snapshot.docs.map(processBattleDoc).filter(b => b.id !== 'error_no_data_A');
            setAllBattles(battles);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === BATCH_SIZE);
        }
        allLoaded = true;
        checkCombinedLoading();
      },
      (err) => {
        console.error('Error fetching all battles:', err);
        setError((prevError) => prevError ? `${prevError}\nFailed to load all battles` : 'Failed to load all battles');
        allLoaded = true;
        checkCombinedLoading();
      }
    );
    
    return () => {
      unsubscribeUpcoming();
      unsubscribeAll();
    };
  }, []);

  useEffect(() => {
    if (inView && hasMore && !loadingMore && !loading) {
      loadMoreBattles();
    }
  }, [inView, hasMore, loadingMore, loading]);

  const loadMoreBattles = async () => {
    if (!lastVisible || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextQuery = query(
        collection(db, 'battles'),
        where('status', 'in', ['accepted', 'ongoing', 'completed']),
        orderBy('dateTime', 'desc'),
        startAfter(lastVisible),
        firestoreLimit(BATCH_SIZE)
      );

      const snapshot = await getDocs(nextQuery);
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const newBattles = snapshot.docs.map(processBattleDoc).filter(b => b.id !== 'error_no_data_A');
        setAllBattles(prev => [...prev, ...newBattles]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
      }
    } catch (err) {
      console.error('Error loading more battles:', err);
      setError((prevError) => prevError ? `${prevError}\nFailed to load more battles` : 'Failed to load more battles');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg mt-4 text-muted-foreground">Loading battles...</p>
      </div>
    );
  }

  if (error && upcomingBattles.length === 0 && allBattles.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] p-4 text-center">
        <p className="text-xl font-semibold text-destructive">An Error Occurred</p>
        <pre className="mt-2 text-sm whitespace-pre-wrap bg-red-50 dark:bg-red-900/30 p-3 rounded-md text-destructive-foreground">{error}</pre>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      {error && (upcomingBattles.length > 0 || allBattles.length > 0) && (
         <div className="p-4 mb-6 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-900/30 dark:text-yellow-300" role="alert">
            <span className="font-medium">Notice:</span> {error}
        </div>
      )}

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-primary border-b dark:border-gray-700 pb-3">Upcoming Battles</h2>
        {upcomingBattles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {upcomingBattles.map((battle) => (
              <BattleCard key={`upcoming-${battle.id}`} battle={battle} />
            ))} 
          </div>
        ) : (
          <p className="text-muted-foreground italic py-4 text-center">No upcoming accepted battles scheduled.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-primary border-b dark:border-gray-700 pb-3">Battle History</h2>
        {allBattles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {allBattles.map((battle) => (
              <BattleCard key={`all-${battle.id}`} battle={battle} />
            ))} 
          </div>
        ) : (
           !loading && !error && <p className="text-muted-foreground italic py-4 text-center">No battle history found.</p>
        )}
        
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center items-center mt-10 py-4">
            {loadingMore ? (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary mr-3" />
                <span>Loading more battles...</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Scroll down to load more battles.</p>
            )}
          </div>
        )}
        {!hasMore && allBattles.length > 0 && (
           <p className="text-center mt-10 py-4 text-muted-foreground">You've reached the end of the battle list.</p>
        )}
        {!hasMore && allBattles.length === 0 && upcomingBattles.length === 0 && !loading && !error && (
             <p className="text-center mt-10 py-4 text-muted-foreground text-lg">No battles to display at the moment. Why not start one?</p>
        )}
      </section>
    </div>
  );
}
      setLoadingMore(false);
    }
  };

  const processBattleDoc = (doc: any): Battle => {
    const data = doc.data();
    const creatorAProfile: UserProfile = {
      id: data.creatorAId,
      fullName: data.creatorAName,
      avatarUrl: data.creatorAAvatar,
      email: data.creatorAEmail || `${data.creatorAId}@placeholder.email`,
    };
    const creatorBProfile: UserProfile = {
      id: data.creatorBId,
      fullName: data.creatorBName || 'TBD',
      avatarUrl: data.creatorBAvatar,
      email: data.creatorBEmail || `${data.creatorBId}@placeholder.email`,
    };

    return {
      id: doc.id,
      battleId: doc.id,
      creatorA: creatorAProfile,
      creatorB: creatorBProfile,
      creatorAId: data.creatorAId,
      creatorBId: data.creatorBId,
      creatorAName: data.creatorAName,
      creatorBName: data.creatorBName || 'TBD',
      creatorAAvatar: data.creatorAAvatar,
      creatorBAvatar: data.creatorBAvatar,
      dateTime: data.dateTime,
      mode: data.mode,
      status: data.status,
      requestedBy: data.requestedBy,
      requestType: data.requestType,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      title: data.title,
      description: data.description,
    };
  };

  if (loading && upcomingBattles.length === 0 && allBattles.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Upcoming Battles Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4 flex items-center text-primary">
          <CalendarIcon className="h-6 w-6 mr-2" />
          Upcoming Battles
        </h2>
        <div className="space-y-4">
          {upcomingBattles.length > 0 ? (
            upcomingBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))
          ) : (
            <p className="text-muted-foreground">No upcoming battles scheduled.</p>
          )}
        </div>
      </section>

      {/* All Battles Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4 flex items-center text-primary">
          <Swords className="h-6 w-6 mr-2" />
          All Battles
        </h2>
        <div className="space-y-4">
          {allBattles.length > 0 ? (
            <>
              {allBattles.map((battle) => (
                <BattleCard key={battle.id} battle={battle} />
              ))}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No battles found.</p>
          )}

export default function BattlesCalendarView() {
  const [upcomingBattles, setUpcomingBattles] = useState<Battle[]>([]);
  const [allBattles, setAllBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const BATCH_SIZE = 10;

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Fetch upcoming battles (next 5)
  useEffect(() => {
    const now = new Date();
    const upcomingQuery = query(
      collection(db, 'battles'),
      where('status', '==', 'accepted'),
      where('dateTime', '>=', Timestamp.fromDate(now)),
      orderBy('dateTime', 'asc'),
      firestoreLimit(5)
    );

    const unsubscribeUpcoming = onSnapshot(
      upcomingQuery,
      (snapshot) => {
        const battles = snapshot.docs.map(processBattleDoc);
        setUpcomingBattles(battles);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching upcoming battles:', err);
        setError('Failed to load upcoming battles');
        setLoading(false);
      }
    );

    return () => unsubscribeUpcoming();
  }, []);

  // Initial load of all battles
  useEffect(() => {
    const now = new Date();
    const allBattlesQuery = query(
      collection(db, 'battles'),
      where('status', '==', 'accepted'),
      orderBy('dateTime', 'desc'),
      firestoreLimit(BATCH_SIZE)
    );

    const unsubscribeAll = onSnapshot(
      allBattlesQuery,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const battles = snapshot.docs.map(processBattleDoc);
          setAllBattles(battles);
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === BATCH_SIZE);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching all battles:', err);
        setError('Failed to load battles');
        setLoading(false);
      }
    );

    return () => unsubscribeAll();
  }, []);

  // Load more battles when scrolled to bottom
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      loadMoreBattles();
    }
  }, [inView, hasMore, loadingMore]);

  const loadMoreBattles = async () => {
    if (!lastVisible || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const nextQuery = query(
        collection(db, 'battles'),
        where('status', '==', 'accepted'),
        orderBy('dateTime', 'desc'),
        startAfter(lastVisible),
        firestoreLimit(BATCH_SIZE)
      );

      const snapshot = await getDocs(nextQuery);
      const newBattles = snapshot.docs.map(processBattleDoc);
      
      setAllBattles(prev => [...prev, ...newBattles]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(newBattles.length === BATCH_SIZE);
    } catch (err) {
      console.error('Error loading more battles:', err);
      setError('Failed to load more battles');
    } finally {
      setLoadingMore(false);
    }
  };

  const processBattleDoc = (doc: any): Battle => {
    const data = doc.data();
    const creatorAProfile: UserProfile = {
      id: data.creatorAId,
      fullName: data.creatorAName,
      avatarUrl: data.creatorAAvatar,
      email: data.creatorAEmail || `${data.creatorAId || 'userA'}@placeholder.email`, // UserProfile requires email
      // role: data.creatorARole || 'user', // Add if available and part of UserProfile used here
    };
    const creatorBProfile: UserProfile = {
      id: data.creatorBId,
      fullName: data.creatorBName || 'TBD',
      avatarUrl: data.creatorBAvatar,
      email: data.creatorBEmail || `${data.creatorBId || 'userB'}@placeholder.email`, // UserProfile requires email
      // role: data.creatorBRole || 'user', // Add if available
    };

    return {
      id: doc.id,
      battleId: doc.id, // Fulfil Battle type requirement
      creatorA: creatorAProfile,
      creatorB: creatorBProfile,
      creatorAId: data.creatorAId,
      creatorBId: data.creatorBId,
      creatorAName: data.creatorAName,
      creatorBName: data.creatorBName || 'TBD',
      creatorAAvatar: data.creatorAAvatar,
      creatorBAvatar: data.creatorBAvatar,
      dateTime: data.dateTime, // Keep as Timestamp as per Battle type
      mode: data.mode,
      status: data.status,
      requestedBy: data.requestedBy,
      requestType: data.requestType,
      createdAt: data.createdAt, // Keep as Timestamp
      updatedAt: data.updatedAt, // Keep as Timestamp
      // Map other optional fields from Battle type if they exist in 'data'
      title: data.title,
      description: data.description,
      // ...etc for other fields like prize, rules, etc.
    };
  };


  if (loading && upcomingBattles.length === 0 && allBattles.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Upcoming Battles
        </h2>
        <div className="space-y-4">
          {upcomingBattles.length > 0 ? (
            upcomingBattles.map((battle) => (
              <BattleCard key={`upcoming-${battle.id}`} battle={battle} />
            ))
          ) : (
            <p className="text-muted-foreground">No upcoming battles scheduled.</p>
          )}
        </div>
      </section>

      {/* All Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Battles</h2>
        <div className="space-y-4">
          {allBattles.length > 0 ? (
            allBattles.map((battle, index) => (
              <div key={`all-${battle.id}-${index}">
                {(index === 0 ||
                  (battle.dateTime && allBattles[index - 1]?.dateTime &&
                    format(battle.dateTime.toDate(), 'yyyy-MM-dd') !== format(allBattles[index - 1]!.dateTime!.toDate(), 'yyyy-MM-dd'))) && (
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    {battle.dateTime ? formatBattleDate(battle.dateTime) : 'Date not set'}
                  </h3>
                )}
                <BattleCard battle={battle} />
              </div>
            ))
          ) : (
            !loading && <p className="text-muted-foreground">No past battles found.</p>
          )}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {!hasMore && allBattles.length > 0 && (
              <p className="text-sm text-muted-foreground">No more battles to show</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function BattleCard({ battle }: { battle: Battle }) {
  const status = BATTLE_STATUS[battle.status.toLowerCase() as keyof typeof BATTLE_STATUS] || 
    { label: battle.status, variant: 'secondary' as const };
  const modeColor = BATTLE_MODE_COLORS[battle.mode] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <Badge variant={status.variant} className="capitalize">{status.label}</Badge>
            <Badge className={cn("font-medium", modeColor)}>{battle.mode}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            ID: {battle.id.substring(0, 6)}
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={battle.creatorAAvatar} alt={battle.creatorAName} />
              <AvatarFallback>{battle.creatorAName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{battle.creatorAName}</span>
            <Swords className="h-5 w-5 text-destructive" />
            <Avatar className="h-8 w-8">
              <AvatarImage src={battle.creatorBAvatar} alt={battle.creatorBName} />
              <AvatarFallback>{battle.creatorBName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{battle.creatorBName}</span>
          </div>
        </div>

        <div className="border-t pt-3 mt-3 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Requested by: {battle.requestedBy === battle.creatorAId ? battle.creatorAName : battle.creatorBName}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {formatBattleDate(battle.dateTime)}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-end">
              <Clock className="h-3 w-3 mr-1" />
              {formatBattleTime(battle.dateTime)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Original content that was below the loading check, which is now part of the main return or BattleCard
/*
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Upcoming Battles
        </h2>
        <div className="space-y-4">
          {upcomingBattles.length > 0 ? (
            upcomingBattles.map((battle) => (
              <BattleCard key={`upcoming-${battle.id}`} battle={battle} />
            ))
          ) : (
            <p className="text-muted-foreground">No upcoming battles scheduled.</p>
          )}
        </div>
      </section>

      {/* All Battles Section */}
      <section>
    </div>
  </div>
</section>

// ...
*/
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Upcoming Battles
        </h2>
        <div className="space-y-4">
          {upcomingBattles.length > 0 ? (
            upcomingBattles.map((battle) => (
              <BattleCard key={`upcoming-${battle.id}`} battle={battle} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming battles scheduled
            </div>
          )}
        </div>
      </section>

      {/* All Battles Section */}
      <section>
    </div>
      </section>

      {/* All Battles Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Battles</h2>
        <div className="space-y-4">
          {allBattles.map((battle, index) => (
            <div key={`all-${battle.id}-${index}">
              {(index === 0 || 
                (battle.dateTime && allBattles[index - 1]?.dateTime && 
                 format(battle.dateTime.toDate(), 'yyyy-MM-dd') !== format(allBattles[index - 1]!.dateTime!.toDate(), 'yyyy-MM-dd'))) && (
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {battle.dateTime ? formatBattleDate(battle.dateTime) : 'Date not set'}
                </h3>
              )}
              <BattleCard battle={battle} />
            </div>
          ))}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {!hasMore && allBattles.length > 0 && (
              <p className="text-sm text-muted-foreground">No more battles to show</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function BattleCard({ battle }: { battle: Battle }) {
  const status = BATTLE_STATUS[battle.status.toLowerCase() as keyof typeof BATTLE_STATUS] || 
    { label: battle.status, variant: 'outline' as const };
  const modeColor = BATTLE_MODE_COLORS[battle.mode] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={battle.creatorA.avatarUrl} alt={battle.creatorA.fullName} />
                  <AvatarFallback>{battle.creatorA.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{battle.creatorA.fullName}</span>
              </div>
              <Swords className="h-4 w-4 mx-2 text-muted-foreground" />
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={battle.creatorB?.avatarUrl} alt={battle.creatorB?.fullName} />
                  <AvatarFallback>{battle.creatorB?.fullName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <span>{battle.creatorB?.fullName || 'TBD'}</span>
              </div>
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
              <Badge className={cn("text-xs", modeColor)}>
                {battle.mode}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {formatBattleDate(battle.dateTime)}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-end">
              <Clock className="h-3 w-3 mr-1" />
              {formatBattleTime(battle.dateTime)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-xs">
              View Details
            </Button>
            {battle.status === 'accepted' && (
              <Button size="sm" className="text-xs">
                Join Battle
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Requested by {battle.creatorA.fullName}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
