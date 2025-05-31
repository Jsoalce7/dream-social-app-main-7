
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit, or, startAt, endAt } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { UserProfile } from '@/types';

const DEBOUNCE_DELAY = 500; // milliseconds

export interface UseUserSearchResult {
  searchResults: UserProfile[];
  loading: boolean;
  error: string | null;
  searchUsers: (searchTerm: string) => void;
}

export function useUserSearch(): UseUserSearchResult {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchUsers = useCallback(async (term: string) => {
    if (!term.trim() || authLoading || !currentUser) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      // Firestore does not support case-insensitive search natively or partial text search like SQL LIKE.
      // A common workaround is to store a lowercased version of the fields you want to search on,
      // or use a third-party search service like Algolia or Typesense for more advanced search.
      // For this basic implementation, we'll do a "starts-with" query on fullName and tiktokUsername.
      // This requires an exact prefix match (case-sensitive unless you store lowercase versions).
      
      // Query for fullName (starts with)
      const fullNameQuery = query(
        usersRef,
        where('fullName', '>=', term),
        where('fullName', '<=', term + '\uf8ff'), // \uf8ff is a very high code point in Unicode
        limit(10)
      );

      // Query for tiktokUsername (starts with)
      const tiktokUsernameQuery = query(
        usersRef,
        where('tiktokUsername', '>=', term),
        where('tiktokUsername', '<=', term + '\uf8ff'),
        limit(10)
      );
      
      const [fullNameSnap, tiktokUsernameSnap] = await Promise.all([
        getDocs(fullNameQuery),
        getDocs(tiktokUsernameQuery)
      ]);

      const usersMap = new Map<string, UserProfile>();

      const processSnapshot = (snapshot: any) => { // Using 'any' temporarily for Firebase snapshot type
        snapshot.forEach((doc: any) => {
          const userData = { id: doc.id, ...doc.data() } as UserProfile;
          if (userData.id !== currentUser.id && !currentUser.blockedUsers?.includes(userData.id)) {
             // Ensure user is not already added from another query (e.g. if fullName and tiktokUsername match)
            if(!usersMap.has(userData.id)){
                 usersMap.set(userData.id, userData);
            }
          }
        });
      };

      processSnapshot(fullNameSnap);
      processSnapshot(tiktokUsernameSnap);
      
      setSearchResults(Array.from(usersMap.values()));

    } catch (e: any) {
      console.error("Error searching users:", e);
      setError(`Failed to search users: ${e.message}`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (debouncedTerm) {
      fetchUsers(debouncedTerm);
    } else {
      setSearchResults([]);
    }
  }, [debouncedTerm, fetchUsers]);

  const searchUsers = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  };

  return { searchResults, loading, error, searchUsers };
}
