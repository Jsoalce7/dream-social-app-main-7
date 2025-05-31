'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { format } from "date-fns";
import { Loader2, Swords, User, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { useBattleRequests } from "@/hooks/use-battle-requests";
import type { Battle } from "@/types";

interface BattleRequestsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function BattleRequestsDialog({ open, onClose }: BattleRequestsDialogProps) {
  const { battleRequests, isLoading, error, acceptBattle, declineBattle } = useBattleRequests();
  
  const handleAccept = async (battleId: string) => {
    try {
      await acceptBattle(battleId);
    } catch (error) {
      console.error("Error accepting battle:", error);
    }
  };
  
  const handleDecline = async (battleId: string) => {
    try {
      await declineBattle(battleId);
    } catch (error) {
      console.error("Error declining battle:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Battle Requests</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : battleRequests.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No pending battle requests
            </div>
          ) : (
            battleRequests.map((battle: Battle) => {
              const battleDate = battle.dateTime?.toDate ? battle.dateTime.toDate() : new Date();
              const formattedDate = format(battleDate, 'MMM d, yyyy');
              const formattedTime = format(battleDate, 'h:mm a');
              
              return (
                <div key={battle.id} className="space-y-4 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={battle.creatorA?.avatarUrl} alt={battle.creatorA?.fullName} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {battle.creatorA?.fullName || 'Unknown User'} challenges you to a battle!
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{formattedDate}</span>
                          <Clock className="h-3.5 w-3.5 ml-2 mr-1" />
                          <span>{formattedTime}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex items-center">
                      <Swords className="h-3.5 w-3.5 mr-1" />
                      {battle.mode || 'Standard'}
                    </Badge>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecline(battle.id)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(battle.id)}
                    >
                      Accept Challenge
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
