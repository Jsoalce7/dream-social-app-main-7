import type { Battle, UserProfile } from '@/types'; // Import UserProfile
import BattleCard from './battle-card';

interface BattleListProps {
  battles: Battle[];
  currentUserProfile: UserProfile | null; // Accept currentUserProfile prop
}

export default function BattleList({ battles, currentUserProfile }: BattleListProps) {
  if (!battles || battles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No upcoming battles.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Request a new battle to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {battles.map((battle) => (
        // Pass currentUserProfile to BattleCard
        <BattleCard key={battle.id} battle={battle} currentUserProfile={currentUserProfile} />
      ))}
    </div>
  );
}
