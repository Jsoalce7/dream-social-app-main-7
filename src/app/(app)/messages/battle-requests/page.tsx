'use client';

import { Metadata } from 'next';
import { BattleRequestsView } from '@/components/messaging/battle-requests-view';
import { useBattleRequests } from '@/hooks/use-battle-requests';
import { useEffect } from 'react';

export const metadata: Metadata = {
  title: 'Battle Requests',
  description: 'View and manage your battle requests',
};

export default function BattleRequestsThreadPage() {
  const { markAllAsRead } = useBattleRequests();

  // Mark all battle requests as read when the component mounts
  useEffect(() => {
    void markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">Battle Requests</h1>
        <p className="text-sm text-muted-foreground">
          Manage your incoming battle requests
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <BattleRequestsView />
      </div>
    </div>
  );
}
