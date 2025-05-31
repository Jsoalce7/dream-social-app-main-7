'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Swords, Calendar } from 'lucide-react';
import type { Battle, UserProfile, BattleMode, BattleStatus, BattleRequestType } from '@/types';

export default function UpcomingBattles() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current time
    const now = new Date();
    
    // Create a query for accepted battles with dateTime in the future
    const upcomingBattlesQuery = query(
      collection(db, 'battles'),
      where('status', '==', 'accepted'),
      where('dateTime', '>=', Timestamp.fromDate(now)),
      orderBy('dateTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      upcomingBattlesQuery,
      (snapshot) => {
        try {
          const upcomingBattles = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              mode: data.mode as BattleMode,
              status: data.status as BattleStatus,
              requestedBy: data.requestedBy as string,
              requestType: data.requestType as BattleRequestType,
              dateTime: (data.dateTime as Timestamp).toDate(),
              createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
              creatorA: {
                id: data.creatorAId as string,
                fullName: data.creatorAName as string,
                avatarUrl: data.creatorAAvatar as string | undefined,
                email: '', // Placeholder
              } as UserProfile,
              creatorB: {
                id: data.creatorBId as string,
                fullName: data.creatorBName as string,
                avatarUrl: data.creatorBAvatar as string | undefined,
                email: '', // Placeholder
              } as UserProfile,
            } as Battle;
          });
          setBattles(upcomingBattles);
          setIsLoading(false);
          setError(null);
        } catch (err: any) {
          console.error('Error processing upcoming battles:', err);
          setError('Failed to load upcoming battles. Please try again.');
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching upcoming battles:', err);
        setError('Failed to load upcoming battles. Please try again.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (battles.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" /> Upcoming Battles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No upcoming battles scheduled.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" /> Upcoming Battles
        </CardTitle>
        <CardDescription>Next {battles.length} scheduled battles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {battles.map((battle) => (
            <Card key={battle.id} className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center text-base">
                  <Swords className="h-5 w-5 mr-2 text-primary" />
                  {battle.creatorA.fullName} vs {battle.creatorB.fullName}
                </CardTitle>
                <CardDescription>
                  <div className="flex flex-col space-y-1">
                    <span>Mode: {battle.mode}</span>
                    <span>Date: {battle.dateTime.toLocaleDateString()}</span>
                    <span>Time: {battle.dateTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
