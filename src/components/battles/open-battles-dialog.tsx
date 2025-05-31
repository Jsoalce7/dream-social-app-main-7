'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2, Swords, Users } from 'lucide-react';
import type { Battle } from '@/types';

interface OpenBattlesDialogProps {
  openBattles: Battle[];
  isLoading: boolean;
  error: string | null;
  onAccept: (battleId: string) => void;
}

export default function OpenBattlesDialog({
  openBattles,
  isLoading,
  error,
  onAccept,
}: OpenBattlesDialogProps) {
  const hasOpenBattles = openBattles.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Users className="h-5 w-5" />
          <span className="ml-2">Open Battles</span>
          {hasOpenBattles && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {openBattles.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Open Battle Challenges</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mb-4 whitespace-pre-wrap">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Open Battles</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && !hasOpenBattles && (
          <p className="text-center text-muted-foreground py-8">
            No open battle challenges available.
          </p>
        )}
        {!isLoading && !error && hasOpenBattles && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            {openBattles.map((battle) => (
              <Card key={battle.id} className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Swords className="h-5 w-5 mr-2 text-primary" /> Open Challenge from{' '}
                    {battle.creatorA.fullName || 'Unknown User'}
                  </CardTitle>
                  <CardDescription>
                    Mode: {battle.mode} | Proposed Date:{' '}
                    {battle.dateTime.toLocaleDateString()} at{' '}
                    {battle.dateTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end space-x-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onAccept(battle.id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Challenge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
