
'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, AtSign, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter

interface UserCardPopoverProps {
  userId: string;
  children: ReactNode;
  triggerAsChild?: boolean;
}

export default function UserCardPopover({
  userId,
  children,
  triggerAsChild = true,
}: UserCardPopoverProps) {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    if (!isOpen || !userId || userData) return; // Only fetch if popover is open, userId is present, and data isn't already loaded

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
        } else {
          setError('User profile not found.');
          toast({ title: 'Error', description: 'User profile not found.', variant: 'destructive' });
        }
      } catch (err) {
        console.error('Error fetching user data for popover:', err);
        setError('Failed to load user data.');
        toast({ title: 'Error', description: 'Failed to load user data.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [isOpen, userId, userData, toast]);

  const handleMessageUser = () => {
    if (userData?.id) {
      // Navigate to the messages page and pass the user ID to open the chat
      router.push(`/messages?with=${userData.id}`);
      setIsOpen(false); // Close the popover
    } else {
      toast({ title: 'Error', description: 'Could not get user ID to start message.', variant: 'destructive' });
    }
  };

  const profileInitial = userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : (userData?.email ? userData.email.charAt(0).toUpperCase() : 'U');


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild={triggerAsChild}>{children}</PopoverTrigger>
      <PopoverContent className="w-80 shadow-xl rounded-lg p-0" sideOffset={5}>
        {isLoading && (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        )}
        {error && !isLoading && (
          <div className="p-6 text-center text-destructive">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && userData && (
          <>
            <div className="bg-muted/50 h-20 rounded-t-lg relative">
              {/* Optional: Could add a banner image here if available */}
            </div>
            <div className="flex flex-col items-center p-4 -mt-10">
              <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                <AvatarImage src={userData.avatarUrl || `https://placehold.co/80x80.png?text=${profileInitial}`} alt={userData.fullName} data-ai-hint="profile avatar" />
                <AvatarFallback className="text-2xl">{profileInitial}</AvatarFallback>
              </Avatar>
              <h3 className="mt-3 text-xl font-semibold text-foreground">
                {userData.fullName}
              </h3>
              {userData.tiktokUsername && (
                <p className="text-sm text-muted-foreground flex items-center">
                  <AtSign className="h-3 w-3 mr-1" />
                  {userData.tiktokUsername}
                </p>
              )}
              {userData.role && (
                 <Badge variant={userData.role === 'admin' ? 'default' : userData.role === 'coach' ? 'secondary' : 'outline'} className="mt-2 capitalize text-xs flex items-center">
                   <Shield className="h-3 w-3 mr-1" /> {userData.role}
                 </Badge>
              )}
            </div>
            <div className="border-t p-4 flex justify-center">
              <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={handleMessageUser}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> Message
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
