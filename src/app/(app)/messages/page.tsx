'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useDirectMessageThreads } from '@/hooks/use-direct-message-threads';
import { useDirectMessages } from '@/hooks/use-direct-messages';
import DirectMessageWindowComponent from '@/components/messaging/direct-message-window';
import UserSearchComponent from '@/components/messaging/UserSearchComponent';
import DMThreadListComponent from '@/components/messaging/DMThreadListComponent';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, DirectMessageThread, DirectMessage, TypingIndicator } from '@/types';
import type { UseDirectMessageThreadsResult } from '@/hooks/use-direct-message-threads';
import type { UseDirectMessagesResult } from '@/hooks/use-direct-messages';
import { BattleRequestsView } from '@/components/messaging/battle-requests-view';


// Basic layout styling, replace with Tailwind or more sophisticated CSS
const styles = {
  pageContainer: { display: 'flex', height: 'calc(100vh - 4rem)', /* Adjust based on global nav/header */ overflow: 'hidden', backgroundColor: '#f0f2f5' },
  sidebar: { display: 'flex', flexDirection: 'column' as 'column', width: '320px', /* Fixed width for thread list */ borderRight: '1px solid #d1d7dc', backgroundColor: '#fff', height: '100%' },
  mainContent: { flexGrow: 1, display: 'flex', flexDirection: 'column' as 'column', height: '100%' }, // Ensure height for flex children
  loadingOverlay: { position: 'absolute' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10 },
  authMessageContainer: {display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', padding: '2rem', textAlign: 'center' as 'center'}
};

export default function MessagesPage() {
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeChatParticipant, setActiveChatParticipant] = useState<UserProfile | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | 'battle-requests' | null>(null);
  const [threads, setThreads] = useState<DirectMessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  // Initialize Firebase hooks first, regardless of auth state
  const { // Renamed error to threadsError to avoid conflict
    threads: threadsData,
    loadingThreads: threadsLoading,
    error: threadsErrorData,
    selectThread: selectThreadFn,
    findOrCreateThreadWithUser,
  }: UseDirectMessageThreadsResult = useDirectMessageThreads();

  const { // Renamed error to messagesError to avoid conflict
    messages: messagesData,
    loadingMessages: messagesLoading,
    errorMessages: messagesErrorData, // Explicitly using errorMessages from hook
    sendMessage,
    sendTypingIndicator,
    typingUsers: typingUsersData,
    markMessagesAsRead,
  }: UseDirectMessagesResult = useDirectMessages(selectedThreadId || null);

  useEffect(() => {
    // This effect now primarily manages initialLoadComplete based on auth state.
    // Data from hooks (threadsData, messagesData) will be directly used in JSX or other effects.
    if (!authLoading && isAuthenticated) {
      setInitialLoadComplete(true);
    }
    // If auth state changes to unauthenticated, reset initialLoadComplete
    if (!isAuthenticated && !authLoading) {
      setInitialLoadComplete(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    // Effect to synchronize data from useDirectMessageThreads hook to local state
    if (threadsData) setThreads(threadsData);
    setLoadingThreads(threadsLoading);
    setThreadsError(threadsErrorData);
  }, [threadsData, threadsLoading, threadsErrorData]);

  useEffect(() => {
    // Effect to synchronize data from useDirectMessages hook to local state
    if (messagesData) setMessages(messagesData);
    setLoadingMessages(messagesLoading);
    setMessagesError(messagesErrorData); // Ensure this is messagesErrorData from the hook
    if (typingUsersData) setTypingUsers(typingUsersData);
  }, [messagesData, messagesLoading, messagesErrorData, typingUsersData]);

  const handleThreadSelect = useCallback((threadId: string | 'battle-requests') => {
    setSelectedThreadId(threadId);
    if (threadId !== 'battle-requests') {
      selectThreadFn(threadId);
    }
  }, [selectThreadFn]);

  useEffect(() => {
    // Effect to update activeChatParticipant when selectedThreadId or threads change
    if (selectedThreadId && currentUser && threads.length > 0) {
      const currentThread = threads.find(t => t.id === selectedThreadId);
      if (currentThread) {
        const otherId = currentThread.participantIds.find(id => id !== currentUser.id);
        if (otherId && currentThread.participantProfiles && currentThread.participantProfiles[otherId]) {
          setActiveChatParticipant(currentThread.participantProfiles[otherId]);
        } else {
          setActiveChatParticipant(null);
        }
      } else {
        setActiveChatParticipant(null);
      }
    } else {
      setActiveChatParticipant(null);
    }
  }, [selectedThreadId, threads, currentUser]);

  const handleUserSelectedFromSearch = useCallback(async (otherUser: UserProfile) => {
    if (!currentUser) {
      return;
    }
    try {
      const newThreadId = await findOrCreateThreadWithUser(otherUser);
      if (newThreadId) {
        handleThreadSelect(newThreadId);
      }
    } catch (error) {
      console.error('Error in findOrCreateThreadWithUser or selectThread:', error);
    }
  }, [currentUser, findOrCreateThreadWithUser, handleThreadSelect]);

  // Conditional Rendering Logic:
  if (authLoading) {
    return (
      <div style={{...styles.loadingOverlay, position: 'fixed'}}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div style={styles.authMessageContainer}>
        <p>Please sign in to view messages.</p>
      </div>
    );
  }

  // This covers the case where auth is done, user is present, but initial data might still be loading
  // or if threads/messages hooks are still in their initial loading state.
  if (!initialLoadComplete || (loadingThreads && threads.length === 0)) { 
    return (
      <div style={styles.loadingOverlay}>
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="mt-4 text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.sidebar}>
        <UserSearchComponent onSelectUser={handleUserSelectedFromSearch} />
        <DMThreadListComponent
          threads={threads}
          currentUser={currentUser}
          selectedThreadId={selectedThreadId}
          onSelectThread={(threadId: string | 'battle-requests' | null) => {
            if (threadId) handleThreadSelect(threadId);
          }}
          loadingThreads={loadingThreads}
          errorThreads={threadsError} 
        />
      </div>
      <div style={styles.mainContent}>
        {selectedThreadId ? (
          selectedThreadId === 'battle-requests' ? (
            <BattleRequestsView />
          ) : (
            <DirectMessageWindowComponent
              threadId={selectedThreadId}
              messages={messages}
              loadingMessages={loadingMessages}
              errorMessages={messagesError}
              sendMessage={sendMessage}
              sendTypingIndicator={sendTypingIndicator}
              typingUsers={typingUsers}
              otherParticipantProfile={activeChatParticipant} 
            />
          )
        ) : (
          <div style={styles.authMessageContainer}>
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
