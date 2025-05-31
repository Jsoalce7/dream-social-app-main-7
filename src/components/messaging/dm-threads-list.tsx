import { useRouter, usePathname } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DMThread } from '@/types/message';
import { useBattleRequests } from '@/hooks/use-battle-requests';
import { Swords } from 'lucide-react';

interface DMThreadsListProps {
  threads: DMThread[];
  className?: string;
}

export function DMThreadsList({ threads, className }: DMThreadsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount = 0 } = useBattleRequests(); // Default to 0 if undefined

  // Check if the current path is the battle requests thread
  const isBattleRequestsThread = pathname === '/messages/battle-requests';

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-1 p-2">
        {/* Battle Requests Inbox */}
        <div
          className={cn(
            'flex items-center p-3 rounded-lg cursor-pointer hover:bg-accent',
            isBattleRequestsThread && 'bg-accent',
          )}
          onClick={() => router.push('/messages/battle-requests')}
        >
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Swords className="h-5 w-5 text-primary" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {Math.min(9, unreadCount)}{unreadCount > 9 ? '+' : ''}
              </span>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Battle Requests</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? 
                `${unreadCount} new request${unreadCount !== 1 ? 's' : ''}` : 
                'No new requests'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-2" />

        {/* Regular DM Threads */}
        {threads.map((thread) => {
          const otherUser = thread.participants.find((p) => p.id !== thread.currentUserId);
          const isActive = pathname === `/messages/${thread.id}`;

          if (!otherUser) return null;

          return (
            <div
              key={thread.id}
              className={cn(
                'flex items-center p-3 rounded-lg cursor-pointer hover:bg-accent',
                isActive && 'bg-accent',
              )}
              onClick={() => router.push(`/messages/${thread.id}`)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />
                <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{otherUser.name}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {thread.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
              {thread.unreadCount > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {thread.unreadCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
