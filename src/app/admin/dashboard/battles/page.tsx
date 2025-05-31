
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, doc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Battle, UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Swords } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Helper function to safely get data from Firestore doc
const getUserProfileFromRef = async (userRefPath: string): Promise<UserProfile> => {
  const userDocRef = doc(db, userRefPath);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as UserProfile;
  }
   // Return a default/placeholder profile if the user document doesn't exist
  console.warn(`User document not found for ref: ${userRefPath}`);
  return { id: userRefPath.split('/').pop() || 'unknown', fullName: 'Unknown User', email: '', avatarUrl: `https://placehold.co/40x40.png?text=U` };
};

const AdminBattleManagementTable = () => {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingBattleId, setDeletingBattleId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAllBattles = useCallback(async () => {
    setIsLoading(true);
    try {
      const battlesCollectionRef = collection(db, 'battles');
      
      // Admins can see all battles, but delete is restricted by rules.
      // Fetching all allows admin to see status, modification requests (later)
      const q = query(
        battlesCollectionRef,
        orderBy('createdAt', 'desc') // Order by creation date
      );
      
      const querySnapshot = await getDocs(q); // Use getDocs for a snapshot, or onSnapshot for real-time
      const fetchedBattles: Battle[] = [];

      for (const battleDoc of querySnapshot.docs) {
        const battleData = battleDoc.data();

         let creatorARefPath: string | undefined;
          if (battleData.creatorARef) {
            if (typeof battleData.creatorARef === 'string') {
              creatorARefPath = battleData.creatorARef;
            } else if (battleData.creatorARef.path && typeof battleData.creatorARef.path === 'string') {
              creatorARefPath = battleData.creatorARef.path;
            }
          }

          let creatorBRefPath: string | undefined;
          if (battleData.creatorBRef) {
            if (typeof battleData.creatorBRef === 'string') {
              creatorBRefPath = battleData.creatorBRef;
            } else if (battleData.creatorBRef.path && typeof battleData.creatorBRef.path === 'string') {
              creatorBRefPath = battleData.creatorBRef.path;
            }
          }

          if (!creatorARefPath || !creatorBRefPath) {
            console.warn(
              `Battle document ${battleDoc.id} is missing valid creatorARef or creatorBRef or they are malformed. Skipping.`,
              { creatorARef: battleData.creatorARef, creatorBRef: battleData.creatorBRef }
            );
            continue;
          }

        // Fetch user profiles using the references
        const creatorA = await getUserProfileFromRef(creatorARefPath);
        const creatorB = await getUserProfileFromRef(creatorBRefPath);
        
        const dateTime = battleData.dateTime ? (battleData.dateTime as Timestamp).toDate() : null; // Handle cases where dateTime might be missing

        fetchedBattles.push({
          id: battleDoc.id,
          creatorA,
          creatorB,
          dateTime,
          mode: battleData.mode,
          status: battleData.status,
          requestedBy: battleData.requestedBy,
          // Add other battle properties if needed for display
        });
      }
      setBattles(fetchedBattles);
    } catch (error) {
      console.error("Error fetching battles for admin:", error);
      toast({ title: 'Error', description: 'Could not fetch battles list.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Consider using onSnapshot here for real-time updates in admin view
    const unsubscribe = onSnapshot(collection(db, 'battles'), async (snapshot) => {
        const updatedBattles: Battle[] = [];
         for (const battleDoc of snapshot.docs) {
            const battleData = battleDoc.data();

             let creatorARefPath: string | undefined;
              if (battleData.creatorARef) {
                if (typeof battleData.creatorARef === 'string') {
                  creatorARefPath = battleData.creatorARef;
                } else if (battleData.creatorARef.path && typeof battleData.creatorARef.path === 'string') {
                  creatorARefPath = battleData.creatorARef.path;
                }
              }

              let creatorBRefPath: string | undefined;
              if (battleData.creatorBRef) {
                if (typeof battleData.creatorBRef === 'string') {
                  creatorBRefPath = battleData.creatorBRef;
                } else if (battleData.creatorBRef.path && typeof battleData.creatorBRef.path === 'string') {
                  creatorBRefPath = battleData.creatorBRef.path;
                }
              }

              if (!creatorARefPath || !creatorBRefPath) {
                console.warn(
                  `Battle document ${battleDoc.id} is missing valid creatorARef or creatorBRef or they are malformed. Skipping.`,
                  { creatorARef: battleData.creatorARef, creatorBRef: battleData.creatorBRef }
                );
                continue;
              }

            // Fetch user profiles using the references
            const creatorA = await getUserProfileFromRef(creatorARefPath);
            const creatorB = await getUserProfileFromRef(creatorBRefPath);
            
            const dateTime = battleData.dateTime ? (battleData.dateTime as Timestamp).toDate() : null;

            updatedBattles.push({
              id: battleDoc.id,
              creatorA,
              creatorB,
              dateTime,
              mode: battleData.mode,
              status: battleData.status,
              requestedBy: battleData.requestedBy,
              // Add other battle properties if needed for display
            });
        }
        setBattles(updatedBattles);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching battles (realtime) for admin:", error);
         toast({ title: 'Error', description: 'Could not fetch battles list in real-time.', variant: 'destructive' });
        setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount

  }, [toast]); // Depend on toast

  const handleDeleteBattle = async (battleId: string) => {
    setDeletingBattleId(battleId);
    try {
      await deleteDoc(doc(db, 'battles', battleId));
      toast({ title: 'Battle Deleted', description: 'The battle has been successfully deleted.' });
       // onSnapshot will handle updating the state
    } catch (error) {
      console.error("Error deleting battle:", error);
      toast({ title: 'Error', description: 'Could not delete the battle. Check permissions.', variant: 'destructive' });
    } finally {
      setDeletingBattleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-2 text-muted-foreground">Loading Battles...</p>
      </div>
    );
  }

   if (battles.length === 0) {
     return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Swords className="mr-2 h-5 w-5 text-primary"/>Battle Management</CardTitle>
          <CardDescription>View and manage all battles in the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-10">No battles found.</p>
        </CardContent>
      </Card>
     );
   }

  return (
     <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><Swords className="mr-2 h-5 w-5 text-primary"/>Battle Management</CardTitle>
        <CardDescription>View and manage all battles in the application.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participants</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {battles.map((battle) => (
              <TableRow key={battle.id}>
                <TableCell className="font-medium flex items-center space-x-2">
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={battle.creatorA.avatarUrl || `https://placehold.co/40x40.png?text=${battle.creatorA.fullName?.charAt(0)}`} alt={battle.creatorA.fullName || 'User A'} data-ai-hint="profile avatar" />
                        <AvatarFallback>{battle.creatorA.fullName?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <span>{battle.creatorA.fullName || 'Unknown'}</span>
                    <span>vs</span>
                     <Avatar className="h-7 w-7">
                        <AvatarImage src={battle.creatorB.avatarUrl || `https://placehold.co/40x40.png?text=${battle.creatorB.fullName?.charAt(0)}`} alt={battle.creatorB.fullName || 'User B'} data-ai-hint="profile avatar" />
                        <AvatarFallback>{battle.creatorB.fullName?.charAt(0) || 'B'}</AvatarFallback>
                    </Avatar>
                    <span>{battle.creatorB.fullName || 'Unknown'}</span>
                </TableCell>
                <TableCell>{battle.mode}</TableCell>
                <TableCell>
                    {battle.dateTime ? (
                        <>{new Date(battle.dateTime).toLocaleDateString()} {new Date(battle.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                    ) : (
                        'N/A'
                    )}
                </TableCell>
                <TableCell>
                    <Badge
                        variant={battle.status === 'accepted' || battle.status === 'scheduled' ? 'default' : battle.status === 'pending' ? 'secondary' : 'outline'}
                         className={
                          battle.status === 'accepted' || battle.status === 'scheduled' ? 'bg-green-500 text-white' :
                          battle.status === 'pending' ? 'bg-yellow-500 text-white' :
                          ''
                        }
                    >
                        {battle.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                   {/* Delete button only for scheduled or accepted battles */}
                  {(battle.status === 'scheduled' || battle.status === 'accepted') && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" disabled={deletingBattleId === battle.id}>
                              {deletingBattleId === battle.id ? (
                                 <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                  <Trash2 className="h-4 w-4" />
                              )}
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                 This action cannot be undone. This will permanently delete the battle between {battle.creatorA.fullName} and {battle.creatorB.fullName}.
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBattle(battle.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default function AdminBattleManagementPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Battle Management</h1>
        <p className="text-muted-foreground">View and manage all battles within the ClashSync application.</p>
      </div>
      <AdminBattleManagementTable />
    </div>
  );
}
