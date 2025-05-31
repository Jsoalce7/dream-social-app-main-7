'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface BattleRequestMessageProps {
  battleId: string;
  senderName: string;
  mode: string;
  timestamp: Date;
  isOwn: boolean;
}

export default function BattleRequestMessage({ battleId, senderName, mode, timestamp, isOwn }: BattleRequestMessageProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAccept = async () => {
    setIsUpdating(true);
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, { status: 'accepted' });
      toast({ title: 'Success', description: 'Battle request accepted!' });
      router.push(`/battles?battleId=${battleId}`);
    } catch (error) {
      console.error('Error accepting battle:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to accept battle request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecline = async () => {
    setIsUpdating(true);
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, { status: 'declined' });
      toast({ title: 'Success', description: 'Battle request declined.' });
    } catch (error) {
      console.error('Error declining battle:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to decline battle request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className={`w-[300px] ${isOwn ? 'ml-auto' : 'mr-auto'} shadow-sm`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Battle Request</CardTitle>
        <CardDescription>from {senderName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <div>Mode: {mode || 'Standard'}</div>
          <div className="text-muted-foreground">
            {format(timestamp, 'PPp')}
          </div>
        </div>
      </CardContent>
      {!isOwn && (
        <CardFooter className="flex justify-end gap-2">
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDecline}
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
              >
                Accept
              </Button>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
