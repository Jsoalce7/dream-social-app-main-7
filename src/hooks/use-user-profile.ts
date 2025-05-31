import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

export function useUserProfile(userId: string | null): UserProfile | null {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!userId) {
      setUserProfile(null);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
        } else {
          setUserProfile(null); // User profile not found
        }
      } catch (error) {
        console.error(`Error fetching user profile for ID ${userId}:`, error);
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [userId]); // Re-fetch if userId changes

  return userProfile;
}
