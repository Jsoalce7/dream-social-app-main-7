
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc } from 'firebase/firestore';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true

  useEffect(() => {
    // setLoading(true); // setLoading(true) is already the initial state, not strictly needed here if deps are [].
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in via Firebase Auth. Now fetch/verify Firestore profile.
        setLoading(true); // Set loading true while fetching Firestore profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
          } else {
            console.warn(`User document not found for UID: ${firebaseUser.uid}. Local profile may be incomplete or default.`);
            // Create a minimal local profile if Firestore doc doesn't exist
            setUserProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: firebaseUser.displayName || 'New User (Incomplete Profile)',
              role: 'creator', // Default role, consider implications
            });
          }
        } catch (error) {
          console.error("Error fetching user profile from Firestore:", error);
          setUserProfile(null); // Error fetching profile, treat as not fully authenticated
        } finally {
          setLoading(false);
        }
      } else {
        // User is signed out
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []); // Empty dependency array: runs once on mount and cleans up on unmount.

  return { user: userProfile, loading, isAuthenticated: !!userProfile && !loading };
}
