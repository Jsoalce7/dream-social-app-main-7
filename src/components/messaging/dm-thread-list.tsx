
'use client';

import React from 'react';
import type { DirectMessageThread, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming Avatar components
// import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming ScrollArea
// import { Loader2 } from 'lucide-react';

interface DMThreadListProps {
  threads: DirectMessageThread[];
  loading: boolean;
  error: string | null;
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  currentUser: UserProfile | null; // Pass current user for easy access to ID
}

// Basic styling, replace with your actual styling/Tailwind classes
const styles = {
  container: { width: '300px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' as 'column', backgroundColor: '#f9f9f9' },
  header: { padding: '1rem', borderBottom: '1px solid #e0e0e0', fontSize: '1.1rem', fontWeight: 'bold' as 'bold' },
  list: { flexGrow: 1, overflowY: 'auto' as 'auto' }, // Use ScrollArea here
  listItem: (isSelected: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    backgroundColor: isSelected ? '#e9e9e9' : 'transparent',
    borderBottom: '1px solid #f0f0f0',
    // '&:hover': { backgroundColor: '#f0f0f0' } // This doesn't work directly in inline styles, use classes
  }),
  avatar: { width: '48px', height: '48px', borderRadius: '50%', marginRight: '12px', backgroundColor: '#ddd', flexShrink: 0 },
  avatarImage: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as 'cover' },
  avatarFallback: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#ccc', color: 'white', borderRadius: '50%' },
  threadInfo: { flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' as 'column' }, // Added display flex and column
  participantName: { fontWeight: '600' as '600', whiteSpace: 'nowrap' as 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  lastMessage: { fontSize: '0.9em', color: '#555', whiteSpace: 'nowrap' as 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' },
  timestamp: { fontSize: '0.75em', color: '#999', whiteSpace: 'nowrap' as 'nowrap', paddingTop: '3px', alignSelf: 'flex-start' as 'flex-start' },
  unreadBadge: { backgroundColor: '#007bff', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.7em', fontWeight: 'bold' as 'bold', marginLeft: '8px', flexShrink: 0 },
  centeredMessage: { padding: '2rem', textAlign: 'center' as 'center', color: '#777' },
  contentWrapper: { display: 'flex', flexDirection: 'column' as 'column', flexGrow: 1, minWidth: 0, justifyContent: 'center' }, // Added justifyContent
  topRow: {display: 'flex', justifyContent: 'space-between' as 'space-between', alignItems: 'center', marginBottom: '4px'}
};


export default function DMThreadListComponent({
  threads,
  loading,
  error,
  selectedThreadId,
  onSelectThread,
  currentUser,
}: DMThreadListProps) {

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  if (loading) {
    return <div style={styles.container}><div style={styles.centeredMessage}>Loading threads...</div></div>;
  }

  if (error) {
    return <div style={styles.container}><div style={styles.centeredMessage}>Error: {error}</div></div>;
  }

  if (!currentUser) {
     return <div style={styles.container}><div style={styles.centeredMessage}>Please log in.</div></div>;
  }

  if (threads.length === 0) {
    return <div style={styles.container}><div style={styles.centeredMessage}>No conversations yet.</div></div>;
  }

  return (
    <div style={styles.container}>
      {/* <div style={styles.header}>Messages</div> */}
      <div style={styles.list}>
        {threads.map((thread) => {
          const otherParticipantId = thread.participantIds.find(id => id !== currentUser.id);
          if (!otherParticipantId) return null;

          const otherParticipantProfile = thread.participantProfiles[otherParticipantId];
          const displayName = otherParticipantProfile?.fullName || 'Unknown User';
          const avatarUrl = otherParticipantProfile?.avatarUrl;
          const unreadCount = thread.unreadCounts && thread.unreadCounts[currentUser.id] > 0 ? thread.unreadCounts[currentUser.id] : 0;

          return (
            <div
              key={thread.id}
              style={styles.listItem(selectedThreadId === thread.id)}
              onClick={() => onSelectThread(thread.id)}
              onKeyPress={(e) => e.key === 'Enter' && onSelectThread(thread.id)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedThreadId === thread.id}
              aria-label={`Chat with ${displayName}`}
            >
              <div style={styles.avatar}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} style={styles.avatarImage} />
                ) : (
                  <div style={styles.avatarFallback}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={styles.contentWrapper}>
                <div style={styles.topRow}>
                    <span style={styles.participantName}>{displayName}</span>
                    {thread.lastMessage && <span style={styles.timestamp}>{formatTimestamp(thread.lastMessage.timestamp)}</span>}
                </div>
                <div style={styles.lastMessage}>
                  {thread.lastMessage ? (
                     thread.lastMessage.senderId === currentUser.id ? `You: ${thread.lastMessage.content}` : thread.lastMessage.content
                  ) : (
                    <i>No messages yet</i>
                  )}
                </div>
              </div>
               {unreadCount > 0 && (
                <span style={styles.unreadBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
