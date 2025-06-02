
'use client';

import { useState } from 'react';
import type { Battle, UserProfile, BattleStatus } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, ShieldHalf, Users, Edit, Loader2, Check, X } from 'lucide-react'; // Import Loader2, Check, X
import { cn } from '@/lib/utils';
import UserCardPopover from '@/components/user/user-card-popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase'; // Import db
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore'; // Import Firestore functions
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface BattleCardProps {
  battle: Battle;
  currentUserProfile: UserProfile | null;
}

function getStatusColor(status: BattleStatus) {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-500 hover:bg-yellow-500/90';
    case 'Accepted':
      return 'bg-green-500 hover:bg-green-500/90';
    case 'Declined':
      return 'bg-red-500 hover:bg-red-500/90';
    case 'Ongoing':
      return 'bg-blue-500 hover:bg-blue-500/90 text-primary-foreground';
    case 'Completed':
      return 'bg-gray-500 hover:bg-gray-500/90 text-primary-foreground';

    default:
      return 'bg-gray-300 hover:bg-gray-300/90 text-foreground';
  }
}


export default function BattleCard({ battle, currentUserProfile }: BattleCardProps) {
  const { creatorA, creatorB, dateTime, mode, status } = battle;
  const [isModificationModalOpen, setIsModificationModalOpen] = useState(false);
  const [proposedChanges, setProposedChanges] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission loading
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // State for accept/decline loading
  const { toast } = useToast(); // Initialize useToast

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateTime));

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateTime));

  const isRecipient = currentUserProfile && currentUserProfile.id === creatorB.id;
  const canRespondToRequest = isRecipient && status === 'Pending';

  const isParticipant = currentUserProfile && (currentUserProfile.id === creatorA.id || currentUserProfile.id === creatorB.id);
  const canRequestModification = isParticipant && status === 'Accepted';

  const handleUpdateBattleStatus = async (newStatus: 'Accepted' | 'Declined') => {
    if (!battle.id) {
      toast({ title: 'Error', description: 'Battle ID is missing.', variant: 'destructive' });
      return;
    }
    setIsUpdatingStatus(true);
    try {
      const battleRef = doc(db, 'battles', battle.id);
      await updateDoc(battleRef, {
        status: newStatus,
      });
      toast({ title: 'Success', description: `Battle request ${newStatus}.` });
    } catch (error) {
      console.error(`Error updating battle status to ${newStatus}:`, error);
      toast({ title: 'Error', description: 'Could not update battle status.', variant: 'destructive' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmitModification = async () => {
    if (!currentUserProfile || !currentUserProfile.id || !proposedChanges.trim() || !battle.id) {
      toast({ title: 'Error', description: 'Invalid request or no changes proposed.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'modificationRequests'), {
        battleId: battle.id,
        requestingUserId: currentUserProfile.id,
        proposedChanges: proposedChanges.trim(),
        status: 'pending', // Initial status
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Request Submitted', description: 'Modification request sent to admins for review.' });
      setProposedChanges(''); // Clear textarea
      setIsModificationModalOpen(false); // Close modal
    } catch (error) {
      console.error("Error submitting modification request:", error);
      toast({ title: 'Submission Failed', description: 'Could not submit modification request.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCardPopover userId={creatorA.id}>
              <Avatar className="h-10 w-10 border-2 border-primary cursor-pointer">
                <AvatarImage src={creatorA.avatarUrl || `https://placehold.co/40x40.png?text=${creatorA.fullName?.charAt(0)}`} alt={creatorA.fullName || 'User A'} data-ai-hint="profile avatar" />
                <AvatarFallback>{creatorA.fullName?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
            </UserCardPopover>
            <UserCardPopover userId={creatorA.id}>
              <span className="font-semibold text-lg cursor-pointer hover:underline">{creatorA.fullName || 'Unknown'}</span>
            </UserCardPopover>
          </div>
          <Users className="h-6 w-6 text-primary" />
          <div className="flex items-center space-x-3">
            <UserCardPopover userId={creatorB.id}>
              <span className="font-semibold text-lg cursor-pointer hover:underline">{creatorB.fullName || 'Unknown'}</span>
            </UserCardPopover>
            <UserCardPopover userId={creatorB.id}>
              <Avatar className="h-10 w-10 border-2 border-accent cursor-pointer">
                <AvatarImage src={creatorB.avatarUrl || `https://placehold.co/40x40.png?text=${creatorB.fullName?.charAt(0)}`} alt={creatorB.fullName || 'User B'} data-ai-hint="profile avatar"/>
                <AvatarFallback>{creatorB.fullName?.charAt(0) || 'B'}</AvatarFallback>
              </Avatar>
            </UserCardPopover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-grow">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4 text-primary" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-2 h-4 w-4 text-primary" />
          <span>{formattedTime}</span>
        </div>
        <div className="flex items-center text-sm">
          <ShieldHalf className="mr-2 h-4 w-4 text-primary" />
          {mode && (
            <Badge variant="secondary" className="text-xs">{mode}</Badge>
          )}
        </div>
        <div className="flex items-center">
          <Badge variant="default" className={cn("text-xs font-semibold", getStatusColor(status))}>
            {status}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col space-y-2">
        {canRespondToRequest && (
          <div className="flex w-full space-x-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1" 
              onClick={() => handleUpdateBattleStatus('Accepted')}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4"/>}
              Accept
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="flex-1" 
              onClick={() => handleUpdateBattleStatus('Declined')}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4"/>}
              Decline
            </Button>
          </div>
        )}
        {canRequestModification && currentUserProfile && currentUserProfile.id && (
            <Dialog open={isModificationModalOpen} onOpenChange={setIsModificationModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full"><Edit className="mr-2 h-4 w-4"/> Request Modification</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Request Battle Modification</DialogTitle>
                  <CardDescription>Propose changes to the battle details for admin review.</CardDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="proposedChanges">Proposed Changes</Label>
                    <Textarea
                      id="proposedChanges"
                      placeholder="e.g., Requesting to change the date to August 25th at 7 PM due to a conflict."
                      value={proposedChanges}
                      onChange={(e) => setProposedChanges(e.target.value)}
                      className="resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
                    </DialogClose>
                  <Button type="button" onClick={handleSubmitModification} disabled={!proposedChanges.trim() || isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}
