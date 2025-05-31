
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore'; // Added onSnapshot and Unsubscribe
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ShieldCheck, Diamond, Award } from 'lucide-react'; // Added Award icon
import { Badge } from '@/components/ui/badge';
import UserCardPopover from '@/components/user/user-card-popover';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('diamonds', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data(), diamonds: doc.data().diamonds ?? 0 } as UserProfile);
        });
        setLeaderboardUsers(users);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching leaderboard with onSnapshot:", err);
        setError('Failed to load leaderboard. Please ensure Firestore indexes are set up correctly for users collection, ordering by diamonds (desc).');
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const getRankContent = (rank: number) => {
    if (rank === 1) return <Award className="h-6 w-6 text-yellow-500 fill-yellow-400" />;
    if (rank === 2) return <Award className="h-6 w-6 text-gray-400 fill-gray-300" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-400 fill-orange-300" />;
    return rank;
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Card className="shadow-xl backdrop-blur-md bg-card/80">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Leaderboard</CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            Top 10 users with the highest diamond counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-lg text-muted-foreground">Loading Top Players...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-10">
              <p className="text-red-500 text-lg">{error}</p>
              <p className="text-muted-foreground mt-2">You might need to create a composite index in Firestore: <br/> Collection ID: <code>users</code>, Fields to index: <code>diamonds</code> (Descending).</p>
            </div>
          )}
          {!isLoading && !error && leaderboardUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-lg">No users found on the leaderboard yet.</p>
          )}
          {!isLoading && !error && leaderboardUsers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Diamonds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardUsers.map((user, index) => {
                  const rank = index + 1;
                  return (
                    <TableRow key={user.id} className={cn(
                        "hover:bg-muted/50 transition-colors",
                        rank === 1 && "bg-yellow-500/10",
                        rank === 2 && "bg-gray-500/10",
                        rank === 3 && "bg-orange-500/10"
                    )}>
                      <TableCell className="font-bold text-xl text-center">
                        {getRankContent(rank)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <UserCardPopover userId={user.id}>
                              <Avatar className="h-10 w-10 border-2 border-transparent hover:border-primary transition-all">
                              <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${user.fullName?.charAt(0)}`} alt={user.fullName || 'User'} />
                              <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                          </UserCardPopover>
                          <UserCardPopover userId={user.id}>
                              <span className="font-medium hover:underline cursor-pointer">{user.fullName || 'Anonymous User'}</span>
                          </UserCardPopover>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-lg bg-blue-100 text-blue-700 hover:bg-blue-100/90 px-3 py-1">
                          <Diamond className="mr-2 h-4 w-4 text-blue-500" />
                          {user.diamonds.toLocaleString()} {/* Ensure diamonds is always a number, fallback in snapshot */}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

