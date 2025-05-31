'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertTriangle, Swords } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BattlesCalendarView from '@/components/battles/battles-calendar-view';
import BattleRequestsDialog from '@/components/battles/battle-requests-dialog';
import { collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Battle, BattleMode, BattleRequestType, BattleStatus, UserProfile } from '@/types';


export default function BattlesPage() {
  const [battleRequests, setBattleRequests] = useState<Battle[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchBattleData = useCallback(async () => {
    if (!currentUserProfile?.id) {
      setIsLoadingRequests(false);
      return;
    }

    // Fetch Battle Requests (Direct)
    setIsLoadingRequests(true);
    setErrorRequests(null);
    
    try {
      const requestsQuery = query(
        collection(db, 'battles'),
        where('creatorBId', '==', currentUserProfile.id),
        where('status', '==', 'pending'),
        where('requestType', '==', 'Direct'),
        orderBy('createdAt', 'desc')
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      const fetchedRequests = requestsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          mode: data.mode as BattleMode,
          status: data.status as BattleStatus,
          requestedBy: data.requestedBy as string,
          requestType: data.requestType as BattleRequestType,
          dateTime: data.dateTime?.toDate(),
          createdAt: data.createdAt?.toDate(),
          creatorA: {
            id: data.creatorAId as string,
            fullName: data.creatorAName as string,
            avatarUrl: data.creatorAAvatar as string | undefined,
            email: '',
          } as UserProfile,
          creatorB: {
            id: data.creatorBId as string,
            fullName: data.creatorBName as string,
            avatarUrl: data.creatorBAvatar as string | undefined,
            email: '',
          } as UserProfile,
        } as Battle;
      });
      
      setBattleRequests(fetchedRequests);
    } catch (err: any) {
      console.error('Error fetching battle requests:', err);
      setErrorRequests(err.message || 'Failed to load battle requests.');
    } finally {
      setIsLoadingRequests(false);
    }
  }, [currentUserProfile]);

  useEffect(() => {
    if (!authLoading && currentUserProfile) {
      fetchBattleData();
    } else if (!authLoading && !currentUserProfile) {
      setIsLoadingRequests(false);
    }
  }, [currentUserProfile, authLoading, fetchBattleData]);

  const handleBattleResponse = async (battleId: string, status: 'accepted' | 'declined') => {
    if (!currentUserProfile) return;
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, { status });
      setBattleRequests(prev => prev.filter(b => b.id !== battleId));
      
      if (status === 'accepted') {
        toast({ 
          title: "Battle Accepted!", 
          description: "The battle has been added to your upcoming battles." 
        });
      } else {
        toast({ 
          title: "Battle Declined", 
          description: "The battle request has been declined." 
        });
      }
    } catch (error) {
      console.error(`Error ${status}ing battle:`, error);
      toast({ 
        title: "Error", 
        description: `Failed to ${status} battle. Please try again.`, 
        variant: "destructive" 
      });
    }
  };

  const handleAccept = (requestId: string, battleId: string) => {
    handleBattleResponse(battleId, 'accepted');
  };

  const handleDecline = (requestId: string) => {
    handleBattleResponse(requestId, 'declined');
  };

  if (authLoading || (isLoadingRequests && !currentUserProfile && !errorRequests)) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUserProfile) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
         <Alert variant="default" className="max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
                Please <Link href="/auth/sign-in" className="underline text-primary hover:text-primary/80">sign in</Link> to view and manage battles.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Swords className="h-8 w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Battle Arena</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsDialogOpen(true)}
            disabled={isLoadingRequests || battleRequests.length === 0}
          >
            {isLoadingRequests ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <span>Battle Requests {battleRequests.length > 0 ? `(${battleRequests.length})` : ''}</span>
            )}
          </Button>
          <BattleRequestsDialog
            open={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
          />
          <Button asChild>
            <Link href="/battles/request" className="flex items-center">
              <PlusCircle className="h-4 w-4 mr-2" />
              Request Battle
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <BattlesCalendarView />
      </div>
    </div>
  );
}
