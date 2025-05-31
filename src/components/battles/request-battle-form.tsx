
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { BattleMode, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { CalendarIcon, ClockIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase'; // auth removed
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';


const battleModes: BattleMode[] = ['Standard', 'Duet', 'Team', 'Tournament'];

const requestBattleFormSchema = z.discriminatedUnion('requestType', [
  z.object({
    requestType: z.literal('Direct'),
    opponentId: z.string().min(1, 'Opponent is required for direct battles.'),
    battleDate: z.date({ required_error: 'Battle date is required.' }),
    battleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM).'),
    battleMode: z.enum(battleModes as [BattleMode, ...BattleMode[]], {
      required_error: 'Battle mode is required.',
    }),
  }),
  z.object({
    requestType: z.literal('Open'),
    battleDate: z.date({ required_error: 'Battle date is required.' }),
    battleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM).'),
    battleMode: z.enum(battleModes as [BattleMode, ...BattleMode[]], {
      required_error: 'Battle mode is required.',
    }),
  }),
]);

type RequestBattleFormValues = z.infer<typeof requestBattleFormSchema>;

export default function RequestBattleForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUserProfile, loading: authLoading } = useAuth(); // user is now currentUserProfile
  const [isLoading, setIsLoading] = useState(false);
  const [opponents, setOpponents] = useState<UserProfile[]>([]);
  const [opponentsLoading, setOpponentsLoading] = useState(true);

  // Get request type from URL
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const requestType = searchParams.get('type') === 'open' ? 'Open' : 'Direct';

  const form = useForm<RequestBattleFormValues>({
    resolver: zodResolver(requestBattleFormSchema),
    defaultValues: {
      battleTime: '12:00',
      requestType,
      opponentId: undefined,
    },
  });
  
  useEffect(() => {
    const fetchOpponents = async () => {
      if (!currentUserProfile || !currentUserProfile.id) return; // Check for profile and id
      setOpponentsLoading(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersCollectionRef);
        const fetchedOpponents: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== currentUserProfile.id) { // Exclude current user
            fetchedOpponents.push({ id: doc.id, ...doc.data() } as UserProfile);
          }
        });
        setOpponents(fetchedOpponents);
      } catch (error) {
        console.error("Error fetching opponents: ", error);
        toast({ title: 'Error', description: 'Could not fetch opponents.', variant: 'destructive' });
      } finally {
        setOpponentsLoading(false);
      }
    };

    if (!authLoading && currentUserProfile) {
      fetchOpponents();
    }
  }, [currentUserProfile, authLoading, toast]);


  const onSubmit = async (data: RequestBattleFormValues) => {
    if (!currentUserProfile || !currentUserProfile.id) { // Check for profile and id
        toast({ title: 'Authentication Error', description: 'You must be logged in to request a battle.', variant: 'destructive'});
        return;
    }
    setIsLoading(true);
    
    const [hours, minutes] = data.battleTime.split(':').map(Number);
    const combinedDateTime = new Date(data.battleDate);
    combinedDateTime.setHours(hours, minutes);

    try {
      // Current user's profile is already available in currentUserProfile from useAuth
      // For direct battles, fetch opponent's profile
      let opponentProfile: UserProfile | null = null;
      if (data.requestType === 'Direct') {
        const opponentDocRef = doc(db, 'users', data.opponentId);
        const opponentDocSnap = await getDoc(opponentDocRef);
        if (!opponentDocSnap.exists()) {
          throw new Error("Opponent profile not found.");
        }
        opponentProfile = { id: data.opponentId, ...opponentDocSnap.data() } as UserProfile;
      }

      // Ensure names and avatars have fallback values
      const creatorAName = currentUserProfile.fullName || `User ${currentUserProfile.id.substring(0,5)}`;
      const creatorAAvatar = currentUserProfile.avatarUrl || '';
      
      // For direct battles, get opponent details
      const creatorBName = data.requestType === 'Direct' ? 
        (opponentProfile?.fullName || `User ${opponentProfile?.id.substring(0,5)}`) : '';
      const creatorBAvatar = data.requestType === 'Direct' ? 
        (opponentProfile?.avatarUrl || '') : '';

      const battleData = {
        creatorARef: `/users/${currentUserProfile.id}`,
        creatorAId: currentUserProfile.id,
        creatorAName: creatorAName,
        creatorAAvatar: creatorAAvatar,
        dateTime: combinedDateTime,
        mode: data.battleMode,
        status: 'Pending',
        requestType: data.requestType,
        requestedBy: currentUserProfile.id,
        createdAt: serverTimestamp(),
      };

      if (data.requestType === 'Direct') {
        Object.assign(battleData, {
          creatorBRef: `/users/${data.opponentId}`,
          creatorBId: data.opponentId,
          creatorBName: creatorBName,
          creatorBAvatar: creatorBAvatar,
        });
      }

      const battleDocRef = await addDoc(collection(db, 'battles'), battleData);
      
      const battleId = battleDocRef.id;

      // Create battle request in battleRequests collection
      if (data.requestType === 'Direct' && opponentProfile) {
        await addDoc(collection(db, 'battleRequests'), {
          senderId: currentUserProfile.id,
          senderName: currentUserProfile.fullName || 'Unknown User',
          senderAvatar: currentUserProfile.avatarUrl || '',
          receiverId: data.opponentId,
          receiverName: opponentProfile.fullName || 'Unknown User',
          battleId: battleId,
          mode: data.battleMode,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Only post open challenges to community feed
      if (data.requestType === 'Open') {
        await addDoc(collection(db, 'community_messages'), {
          userId: currentUserProfile.id,
          userName: currentUserProfile.fullName || 'Unknown User',
          userAvatar: currentUserProfile.avatarUrl || '',
          message: `${creatorAName} has created an open ${data.battleMode} battle challenge!`,
          timestamp: serverTimestamp(),
          channelId: 'battle_requests',
          battleId: battleId,
          type: 'battle_request',
        });
      }


      toast({
        title: 'Battle Requested!',
        description: data.requestType === 'Direct' ?
          `Your request to battle ${opponentProfile?.fullName || 'Unknown User'} has been sent.` :
          'Your open battle challenge has been posted.',
      });
      router.push('/battles');
    } catch (error: any) {
      console.error('Error requesting battle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not request battle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading || opponentsLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="requestType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Direct">Direct Battle</SelectItem>
                  <SelectItem value="Open">Open Challenge</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('requestType') === 'Direct' && (
          <div>
        <FormField
          control={form.control}
          name="opponentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Opponent</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an opponent" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {opponents.map((opponent) => (
                    <SelectItem key={opponent.id} value={opponent.id}>
                      {opponent.fullName || `User ${opponent.id.substring(0,5)}`} ({opponent.tiktokUsername || 'N/A'})
                    </SelectItem>
                  ))}
                  {opponents.length === 0 && <p className="p-2 text-sm text-muted-foreground">No opponents available.</p>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="battleDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Battle Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setDate(new Date().getDate() -1)) 
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="battleTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Battle Time</FormLabel>
                <div className="relative">
                <FormControl>
                  <Input type="time" {...field} className="pr-8" />
                </FormControl>
                <ClockIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="battleMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Battle Mode</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a battle mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {battleModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send Battle Request
        </Button>
      </form>
    </Form>
  );
}
