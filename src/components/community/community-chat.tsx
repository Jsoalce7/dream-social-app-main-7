
'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, SendHorizonal, Smile, Users, Hash, Loader2, MessageSquarePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, setDoc } from 'firebase/firestore';
import type { Channel, ChatMessage, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '../ui/label';
import UserCardPopover from '@/components/user/user-card-popover'; // Import the new component


const NewChannelDialog = ({ onChannelCreated }: { onChannelCreated: () => void }) => {
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !currentUserProfile || !currentUserProfile.id) return;

    // Log current user profile for debugging
    console.log("Current user profile attempting channel creation:", JSON.stringify(currentUserProfile, null, 2));

    setIsLoading(true);

    try {
      const channelRef = doc(collection(db, 'channels'));
      
      const dataToSet: {
        name: string;
        createdBy: string;
        createdAt: any; // Firestore ServerTimestamp
        description?: string;
      } = {
        name: channelName.trim().toLowerCase().replace(/\s+/g, '-'), 
        createdBy: currentUserProfile.id,
        createdAt: serverTimestamp(),
      };

      const trimmedDescription = channelDescription.trim();
      if (trimmedDescription) {
        dataToSet.description = trimmedDescription;
      } else {
        // Explicitly do not send the description field if it's empty
      }

      await setDoc(channelRef, dataToSet);
      
      toast({ title: 'Channel Created', description: `Channel #${dataToSet.name} created successfully.` });
      setChannelName('');
      setChannelDescription('');
      onChannelCreated();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error creating channel:", error); 
      toast({ 
        title: 'Error', 
        description: `Could not create channel. Details: ${error.message || 'Missing or insufficient permissions.'}`, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2">
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Create Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Enter the details for your new community channel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateChannel} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="channelName" className="text-right">
              Name
            </Label>
            <Input
              id="channelName"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g., general-chat"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="channelDescription" className="text-right">
              Description
            </Label>
            <Input
              id="channelDescription"
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder="Optional: What this channel is about"
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


export default function CommunityChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { user: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);
  

  useEffect(() => {
    setIsLoadingChannels(true);
    const channelsQuery = query(collection(db, 'channels'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(channelsQuery, (querySnapshot) => {
      const fetchedChannels: Channel[] = [];
      querySnapshot.forEach((doc) => {
        fetchedChannels.push({ id: doc.id, ...doc.data() } as Channel);
      });
      setChannels(fetchedChannels);
      if (fetchedChannels.length > 0 && !activeChannelId) {
        setActiveChannelId(fetchedChannels.find(ch => ch.name === 'general')?.id || fetchedChannels[0].id);
      }
      setIsLoadingChannels(false);
    }, (error) => {
      console.error("Error fetching channels:", error);
      toast({ title: 'Error', description: 'Could not load channels.', variant: 'destructive' });
      setIsLoadingChannels(false);
    });
    return () => unsubscribe();
  }, [activeChannelId, toast]); 


  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    const messagesQuery = query(
      collection(db, 'channels', activeChannelId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        } as ChatMessage);
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error(`Error fetching messages for channel ${activeChannelId}:`, error);
      toast({ title: 'Error', description: `Could not load messages for #${channels.find(c=>c.id === activeChannelId)?.name}.`, variant: 'destructive' });
      setIsLoadingMessages(false);
    });
    return () => unsubscribe();
  }, [activeChannelId, toast, channels]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !activeChannelId || !currentUserProfile || !currentUserProfile.id) return;

    const messageData: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: currentUserProfile.id,
      senderName: currentUserProfile.fullName || 'Anonymous',
      senderAvatarUrl: currentUserProfile.avatarUrl || `https://placehold.co/40x40.png?text=${currentUserProfile.fullName?.charAt(0) || 'A'}`,
      text: newMessage,
      channelId: activeChannelId,
    };

    try {
      await addDoc(collection(db, 'channels', activeChannelId, 'messages'), {
        ...messageData,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' });
    }
  };
  
  const getChannelIcon = (channelName: string) => {
    if (channelName.includes('scheduler') || channelName.includes('battle')) return Hash;
    if (channelName.includes('rookie') || channelName.includes('veteran') || channelName.includes('creator')) return Users;
    return Hash;
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const handleChannelCreated = () => {
    // Potentially re-fetch channels or update state if needed,
    // though onSnapshot should handle this automatically.
  };


  if (authLoading || isLoadingChannels) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!currentUserProfile) {
     return <div className="flex h-full items-center justify-center p-4 text-muted-foreground">Please sign in to access community chat.</div>;
  }


  return (
    <div className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-4rem)]">
      <aside className="hidden md:flex flex-col w-64 border-r bg-card p-4 space-y-1">
        <h2 className="text-lg font-semibold mb-2 px-2">Channels</h2>
        {channels.length === 0 && !isLoadingChannels && (
            <p className="px-2 text-sm text-muted-foreground">No channels available.</p>
        )}
        {channels.map(channel => {
            const Icon = getChannelIcon(channel.name);
            return (
              <Button
                key={channel.id}
                variant={activeChannelId === channel.id ? 'secondary' : 'ghost'}
                className="w-full justify-start text-sm"
                onClick={() => setActiveChannelId(channel.id)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {channel.name}
              </Button>
            )
        })}
         {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'coach') && (
            <NewChannelDialog onChannelCreated={handleChannelCreated} />
        )}
        <Separator className="my-4" />
         <h2 className="text-lg font-semibold mb-2 pt-4 px-2">Moderation</h2>
        <div className="px-2">
            <p className="text-xs text-muted-foreground ">
            Admins can use an external tool (not shown here) to check messages.
            </p>
        </div>
      </aside>

      {/* Main chat area takes full width now */}
      <div className="flex-1 flex flex-col bg-background p-4">
         <div className="border-b pb-2 mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            {activeChannel ? (
              <>
                <Hash className="mr-2 h-5 w-5 text-primary" /> #{activeChannel.name}
              </>
            ) : "No Channel Selected"}
          </h2>
          <p className="text-sm text-muted-foreground">{activeChannel?.description || "Select a channel to start chatting."}</p>
        </div>
        <ScrollArea className="flex-1 mb-4 pr-4" ref={scrollAreaRef}>
          {isLoadingMessages && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
          {!isLoadingMessages && messages.length === 0 && activeChannelId && (
              <p className="text-center text-muted-foreground py-10">No messages in this channel yet. Be the first to say something!</p>
          )}
           {!isLoadingMessages && !activeChannelId && (
              <p className="text-center text-muted-foreground py-10">Select a channel from the sidebar to view messages.</p>
          )}
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserProfile?.id;
              const senderInitial = msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U';
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : ''}`}>
                  {!isOwn && (
                     <UserCardPopover userId={msg.senderId}>
                        <Avatar className="h-8 w-8 self-start cursor-pointer">
                            <AvatarImage src={msg.senderAvatarUrl || `https://placehold.co/40x40.png?text=${senderInitial}`} alt={msg.senderName} data-ai-hint="profile avatar" />
                            <AvatarFallback>{senderInitial}</AvatarFallback>
                        </Avatar>
                     </UserCardPopover>
                  )}
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-card shadow-sm'}`}>
                    {!isOwn && (
                        <UserCardPopover userId={msg.senderId}>
                            <p className="text-xs font-semibold mb-0.5 text-muted-foreground cursor-pointer hover:underline">{msg.senderName}</p>
                        </UserCardPopover>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground/70'} text-right`}>
                      {isClient && msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </p>
                  </div>
                  {isOwn && currentUserProfile && (
                     <UserCardPopover userId={currentUserProfile.id}>
                        <Avatar className="h-8 w-8 self-start cursor-pointer">
                            <AvatarImage src={currentUserProfile.avatarUrl || `https://placehold.co/40x40.png?text=${currentUserProfile.fullName?.charAt(0)}`} alt={currentUserProfile.fullName} data-ai-hint="profile avatar" />
                            <AvatarFallback>{currentUserProfile.fullName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                     </UserCardPopover>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t pt-4">
          <Button variant="ghost" size="icon" type="button" disabled={!activeChannelId}><Paperclip className="h-5 w-5" /></Button>
          <Input
            type="text"
            placeholder={activeChannelId ? `Message #${activeChannel?.name}` : "Select a channel"}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={!activeChannelId || isLoadingMessages}
          />
          <Button variant="ghost" size="icon" type="button" disabled={!activeChannelId}><Smile className="h-5 w-5" /></Button>
          <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90" disabled={!activeChannelId || isLoadingMessages || !newMessage.trim()}>
              <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
