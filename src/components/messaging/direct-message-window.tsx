
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DirectMessage, UserProfile, TypingIndicator } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import BattleRequestMessage from './battle-request-message';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { SendHorizonal, SmilePlus, Loader2 } from 'lucide-react'; // Icons

interface DirectMessageWindowProps {
  threadId: string | null;
  // From useDirectMessages hook
  messages: DirectMessage[];
  loadingMessages: boolean;
  errorMessages: string | null;
  sendMessage: (content: string, contentType?: DirectMessage['contentType']) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => Promise<void>;
  typingUsers: TypingIndicator[];
  // Other props
  otherParticipantProfile: UserProfile | null; // For displaying header info
}

// Basic styling, replace with your actual styling/Tailwind classes
const styles = {
  container: { flexGrow: 1, display: 'flex', flexDirection: 'column' as 'column', backgroundColor: '#fff', height: '100%' }, // Ensure height for flex
  header: { padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', backgroundColor: '#f9f9f9', flexShrink: 0},
  headerAvatar: { width: '32px', height: '32px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ddd' },
  headerName: { fontWeight: 'bold' as 'bold' },
  messagesContainerWrapper: { flexGrow: 1, overflowY: 'hidden' as 'hidden', display: 'flex', flexDirection: 'column' as 'column' }, // Wrapper for scroll
  messagesContainer: { flexGrow: 1, overflowY: 'auto' as 'auto', padding: '1rem' }, // Use ScrollArea
  messageItem: (isOwn: boolean) => ({ 
    display: 'flex', 
    flexDirection: isOwn ? 'row-reverse' as 'row-reverse' : 'row' as 'row', 
    marginBottom: '0.75rem',
    alignItems: 'flex-end' as 'flex-end',
  }),
  avatar: { width: '32px', height: '32px', borderRadius: '50%', margin: '0 8px', backgroundColor: '#ddd', alignSelf: 'flex-start' as 'flex-start', flexShrink: 0},
  avatarImage: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as 'cover' },
  avatarFallback: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#ccc', color: 'white', borderRadius: '50%' },
  messageContentContainer: { maxWidth: 'calc(100% - 48px)' },
  messageBubble: (isOwn: boolean, contentType: string = 'text') => ({
    maxWidth: contentType === 'battleRequest' ? 'none' : '100%',
    padding: contentType === 'battleRequest' ? 0 : '0.5rem 0.75rem',
    borderRadius: contentType === 'battleRequest' ? 0 : '18px',
    backgroundColor: contentType === 'battleRequest' ? 'transparent' : (isOwn ? '#007bff' : '#e9e9eb'),
    color: contentType === 'battleRequest' ? 'inherit' : (isOwn ? 'white' : 'black'),
    wordBreak: 'break-word' as 'break-word',
  }),
  senderName: { fontSize: '0.8em', color: '#555', marginBottom: '2px', marginLeft: '0px' /* Adjusted as avatar is part of flex */ },
  timestamp: (isOwn: boolean) => ({ 
    fontSize: '0.7em', 
    color: isOwn ? '#cce5ff' : '#777', 
    marginTop: '3px', 
    textAlign: isOwn ? 'right' as 'right' : 'left' as 'left'
  }),
  inputArea: { display: 'flex', padding: '0.75rem', borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9', flexShrink: 0 },
  inputField: { flexGrow: 1, marginRight: '0.5rem', padding: '0.6rem', border: '1px solid #ccc', borderRadius: '18px' }, // Replace with Input
  sendButton: { padding: '0.6rem 1rem', borderRadius: '18px' }, // Replace with Button
  centeredMessage: { flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777', padding: '2rem', height: '100%' },
  typingIndicator: { padding: '0 1rem 0.5rem 1rem', fontSize: '0.85em', color: '#777', height: '20px', flexShrink: 0 }
};

export default function DirectMessageWindowComponent({
  threadId,
  messages,
  loadingMessages,
  errorMessages,
  sendMessage,
  sendTypingIndicator,
  typingUsers,
  otherParticipantProfile,
}: DirectMessageWindowProps) {
  const { user: currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollableMessagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollableMessagesContainerRef.current) {
        scrollableMessagesContainerRef.current.scrollTop = scrollableMessagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change, but only if user is near the bottom already or it's an initial load.
    // This prevents auto-scroll if user has scrolled up to read history.
    const container = scrollableMessagesContainerRef.current;
    if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200; // 200px threshold
        if (isNearBottom || messages.length <= 10) { // Auto-scroll for initial messages or if near bottom
            scrollToBottom("auto"); // Use auto for immediate jump on new messages if already at bottom
        } else {
            scrollToBottom(); // Smooth scroll otherwise
        }
    }
  }, [messages]);

  useEffect(() => {
    if(threadId && inputRef.current){
        inputRef.current.focus();
    }
  }, [threadId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !threadId) return;
    await sendMessage(newMessage.trim());
    setNewMessage('');
    sendTypingIndicator(false);
    setTimeout(() => scrollToBottom("smooth"), 0); // Ensure scroll after DOM update for new message
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim() !== '') {
      sendTypingIndicator(true);
    } else {
      sendTypingIndicator(false);
    }
  };
  
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!threadId) {
    return <div style={styles.centeredMessage}>Select a conversation to start messaging.</div>;
  }

  if (loadingMessages && messages.length === 0) {
    return <div style={styles.centeredMessage}>Loading messages...</div>;
  }

  if (errorMessages) {
    return <div style={styles.centeredMessage}>Error: {errorMessages}</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      {otherParticipantProfile && (
        <div style={styles.header}>
          <div style={styles.headerAvatar}>
            {otherParticipantProfile.avatarUrl && (
              <img src={otherParticipantProfile.avatarUrl} alt="" style={styles.avatarImage} />
            )}
          </div>
          <span style={styles.headerName}>{otherParticipantProfile.fullName || 'Unknown User'}</span>
        </div>
      )}

      {/* Messages Area */}
      <div style={styles.messagesContainerWrapper}>
        <div style={styles.messagesContainer} ref={scrollableMessagesContainerRef}>
          {loadingMessages ? (
            <div style={styles.centeredMessage}>Loading messages...</div>
          ) : errorMessages ? (
            <div style={styles.centeredMessage}>Error: {errorMessages}</div>
          ) : messages.length === 0 ? (
            <div style={styles.centeredMessage}>No messages yet. Start the conversation!</div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === currentUser?.id;
              return (
                <div key={message.id} style={styles.messageItem(isOwn)}>
                  {!isOwn && (
                    <div style={styles.avatar}>
                      {message.senderProfile?.avatarUrl ? (
                        <img src={message.senderProfile.avatarUrl} alt="" style={styles.avatarImage} />
                      ) : (
                        <div style={styles.avatarFallback}>
                          {message.senderProfile?.fullName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={styles.messageContentContainer}>
                    {!isOwn && (
                      <div style={styles.senderName}>
                        {message.senderProfile?.fullName || 'Unknown User'}
                      </div>
                    )}
                    <div style={styles.messageBubble(isOwn, message.contentType)}>
                      {message.contentType === 'battleRequest' && message.battleId ? (
                        <BattleRequestMessage
                          battleId={message.battleId}
                          senderName={message.senderProfile?.fullName || 'Unknown User'}
                          mode={message.battleMode || 'Standard'}
                          timestamp={message.timestamp?.toDate() || new Date()}
                          isOwn={isOwn}
                        />
                      ) : (
                        message.content
                      )}
                    </div>
                    <div style={styles.timestamp(isOwn)}>
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                  {isOwn && (
                    <div style={styles.avatar}>
                      {message.senderProfile?.avatarUrl ? (
                        <img src={message.senderProfile.avatarUrl} alt="" style={styles.avatarImage} />
                      ) : (
                        <div style={styles.avatarFallback}>
                          {message.senderProfile?.fullName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Typing Indicator */}
      <div style={styles.typingIndicator}>
        {typingUsers.length > 0 && (
            `${typingUsers.map(u => u.fullName).join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={styles.inputArea}>
        {/* Emoji Button Placeholder */}
        {/* <button type="button" style={{padding: '0.5rem', marginRight: '0.5rem'}}>??</button> */}
        <input
          ref={inputRef}
          type="text"
          style={styles.inputField}
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
        />
        <button type="submit" style={styles.sendButton} disabled={!newMessage.trim() || loadingMessages}>
            Send
        </button>
      </form>
    </div>
  );
}

