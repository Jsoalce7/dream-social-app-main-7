import React from 'react';
import type { DirectMessageThread, UserProfile } from '@/types';

interface DMThreadListComponentProps {
  threads: DirectMessageThread[];
  currentUser: UserProfile | null;
  selectedThreadId: string | null;
  onSelectThread: (threadId: string | null) => void;
  loadingThreads: boolean;
  errorThreads: string | null;
}

const DMThreadListComponent: React.FC<DMThreadListComponentProps> = ({
  threads,
  currentUser,
  selectedThreadId,
  onSelectThread,
  loadingThreads,
  errorThreads,
}) => {
  if (loadingThreads) {
    return <div style={{ padding: '1rem', textAlign: 'center' }}>Loading threads...</div>;
  }

  if (errorThreads) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>Error: {errorThreads}</div>;
  }

  if (!threads || threads.length === 0) {
    return <div style={{ padding: '1rem', textAlign: 'center' }}>No message threads.</div>;
  }

  return (
    <div style={{ overflowY: 'auto', flexGrow: 1 }}>
      {threads.map((thread) => {
        // Determine the other participant's profile for display
        const otherParticipantId = thread.participantIds.find(id => id !== currentUser?.id);
        const otherParticipantProfile = otherParticipantId ? thread.participantProfiles[otherParticipantId] : null;
        const displayName = otherParticipantProfile?.fullName || 'Unknown User';
        const lastMessageContent = thread.lastMessage?.content || 'No messages yet';

        return (
          <div
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #eee',
              cursor: 'pointer',
              backgroundColor: selectedThreadId === thread.id ? '#e9f5ff' : 'transparent',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Basic Avatar Placeholder */}
            <div style={{
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: '#ccc', 
              marginRight: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold'
            }}>
              {displayName.substring(0, 1).toUpperCase()}
            </div>
            <div style={{ flexGrow: 1 }}>
              <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>{displayName}</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lastMessageContent}
              </p>
            </div>
            {currentUser && thread.unreadCounts && thread.unreadCounts[currentUser.id] > 0 && (
              <span style={{
                marginLeft: '0.5rem',
                padding: '0.1rem 0.4rem',
                fontSize: '0.7rem',
                color: 'white',
                backgroundColor: '#007bff',
                borderRadius: '10px'
              }}>
                {thread.unreadCounts[currentUser.id]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DMThreadListComponent;
