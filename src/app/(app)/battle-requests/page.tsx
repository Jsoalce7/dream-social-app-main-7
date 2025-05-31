import { Metadata } from 'next';
import { BattleRequestsView } from '@/components/messaging/battle-requests-view';

export const metadata: Metadata = {
  title: 'Battle Requests',
  description: 'View and manage your battle requests',
};

export default function BattleRequestsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Battle Requests</h1>
        <div className="bg-card rounded-lg border shadow-sm">
          <BattleRequestsView />
        </div>
      </div>
    </div>
  );
}
