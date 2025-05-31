'use client';

import React, { useState, useEffect } from 'react';
import { useBattleRequests } from '@/hooks/use-battle-requests';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Clock } from 'lucide-react';
// Using window.alert as a fallback for toast notifications
const useToast = () => ({
  toast: (options: { title: string; description?: string; variant?: string }) => {
    window.alert(`${options.title}: ${options.description || ''}`);
  }
});

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#fff',
    padding: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '1.25rem',
    fontWeight: 600,
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem 0.5rem 0 0',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.25rem 0.5rem',
    borderRadius: '9999px',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem',
  },
  requestCard: {
    marginBottom: '1rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  cardContent: {
    padding: '1rem',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderTop: '1px solid #f3f4f6',
  },
  senderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
  },
  senderName: {
    fontWeight: 600,
    color: '#111827',
  },
  timestamp: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  battleInfo: {
    marginTop: '0.5rem',
  },
  battleType: {
    fontSize: '0.875rem',
    color: '#4b5563',
  },
  label: {
    fontWeight: 500,
    color: '#374151',
    marginRight: '0.5rem',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    color: 'white',
    ':hover': {
      backgroundColor: '#059669',
    },
  },
  declineButton: {
    borderColor: '#e5e7eb',
    color: '#6b7280',
    ':hover': {
      backgroundColor: '#f3f4f6',
      color: '#111827',
    },
  },
  centeredMessage: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center' as const,
    padding: '1rem',
  },
};

interface BattleDetails {
  dateTime?: Date;
  mode?: string;
}

export const BattleRequestsView = () => {
  const { 
    battleRequests, 
    isLoading, 
    onAccept, 
    onDecline, 
    unreadCount = 0, 
    acceptBattle, 
    declineBattle 
  } = useBattleRequests();
  
  const [battleDetails, setBattleDetails] = useState<{[key: string]: BattleDetails}>({});
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  // Use direct methods if callbacks are not provided
  const handleAccept = onAccept || acceptBattle;
  const handleDecline = onDecline || declineBattle;

  useEffect(() => {
    const fetchBattleDetails = async () => {
      const details: Record<string, BattleDetails> = {};
      
      for (const request of battleRequests) {
        try {
          const battleDoc = await getDoc(doc(db, 'battles', request.battleId));
          if (battleDoc.exists()) {
            const battleData = battleDoc.data();
            details[request.battleId] = {
              dateTime: battleData.dateTime?.toDate(),
              mode: battleData.mode
            };
          }
        } catch (error) {
          console.error(`Error fetching battle details for ${request.battleId}:`, error);
        }
      }
      
      setBattleDetails(details);
    };
    
    if (battleRequests.length > 0) {
      fetchBattleDetails();
    }
  }, [battleRequests]);

  const handleAcceptBattle = async (battleId: string) => {
    if (!handleAccept) return;
    
    try {
      setIsProcessing(prev => ({ ...prev, [battleId]: true }));
      await handleAccept(battleId);
      // Navigate to the battle page after accepting
      router.push(`/battles/${battleId}`);
      toast({
        title: 'Battle Accepted',
        description: 'You have accepted the battle request.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error accepting battle:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept the battle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(prev => ({ ...prev, [battleId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }
  
  if (battleRequests.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.centeredMessage}>
          <p>No pending battle requests</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Battle Requests</h2>
        {unreadCount > 0 && (
          <span style={styles.unreadBadge}>
            {unreadCount} new
          </span>
        )}
      </div>
      <div style={styles.content}>
        {battleRequests.map((request) => (
          <Card key={request.id} style={styles.requestCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {request.senderName || 'Someone'} has requested to battle you!
              </CardTitle>
              <CardDescription className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Date: {battleDetails[request.battleId]?.dateTime ? 
                    format(battleDetails[request.battleId].dateTime as Date, 'MMMM d, yyyy') : 
                    'Date not set'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Time: {battleDetails[request.battleId]?.dateTime ? 
                    format(battleDetails[request.battleId].dateTime as Date, 'h:mm a') : 
                    'Time not set'}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-3 pt-2">
                <Avatar className="h-10 w-10">
                  {request.senderAvatar ? (
                    <AvatarImage src={request.senderAvatar} alt={request.senderName} />
                  ) : (
                    <AvatarFallback>
                      {request.senderName?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{request.senderName || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.createdAt ? format(request.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  <span className="font-medium">Battle Mode:</span> {battleDetails[request.battleId]?.mode || request.mode || 'Standard'}
                </p>
              </div>
            </CardContent>
            <CardFooter style={styles.cardFooter}>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!request.id) return;
                  try {
                    setIsProcessing(prev => ({ ...prev, [request.id!]: true }));
                    if (onDecline) {
                      await onDecline(request.id);
                    }
                    toast({
                      title: 'Battle Declined',
                      description: 'You have declined the battle request.',
                      variant: 'default',
                    });
                  } catch (error) {
                    console.error('Error declining battle:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to decline the battle. Please try again.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsProcessing(prev => ({ ...prev, [request.id!]: false }));
                  }
                }}
                style={styles.declineButton}
                disabled={!request.id || isProcessing[request.id]}
              >
                {isProcessing[request.id!] ? 'Processing...' : 'Decline'}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!request.id) return;
                  try {
                    setIsProcessing(prev => ({ ...prev, [request.id!]: true }));
                    if (handleAccept) {
                      await handleAccept(request.id);
                      router.push(`/battles/${request.id}`);
                    }
                    toast({
                      title: 'Battle Accepted',
                      description: 'You have accepted the battle request.',
                      variant: 'default',
                    });
                  } catch (error) {
                    console.error('Error accepting battle:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to accept the battle. Please try again.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsProcessing(prev => ({ ...prev, [request.id!]: false }));
                  }
                }}
                style={styles.acceptButton}
                disabled={!request.id || isProcessing[request.id]}
              >
                {isProcessing[request.id!] ? 'Processing...' : 'Accept Battle'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
