
'use client';

import React, { useState } from 'react';
import { useUserSearch, UseUserSearchResult } from '@/hooks/use-user-search'; // Adjust path if needed
import type { UserProfile } from '@/types';
// Assuming you might have these UI components, replace with actual ones or basic HTML
// import { Input } from '@/components/ui/input'; 
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Button } from '@/components/ui/button';
// import { Loader2 } from 'lucide-react';

interface UserSearchComponentProps {
  onSelectUser: (user: UserProfile) => void; // Callback when a user is selected to start a chat
}

export default function UserSearchComponent({ onSelectUser }: UserSearchComponentProps) {
  const { searchResults, loading, error, searchUsers } = useUserSearch();
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    searchUsers(event.target.value);
  };

  // Basic styling, replace with your actual styling/Tailwind classes
  const styles = {
    container: { padding: '1rem', borderBottom: '1px solid #eee' },
    input: { width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px' },
    resultsList: { listStyle: 'none', padding: 0, margin: 0 },
    listItem: { display: 'flex', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ddd' },
    avatarImage: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as 'cover' },
    avatarFallback: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#ccc', color: 'white', borderRadius: '50%' },
    userInfo: { display: 'flex', flexDirection: 'column' as 'column' },
    fullName: { fontWeight: 'bold' as 'bold' },
    username: { fontSize: '0.9em', color: '#555' },
    loading: { textAlign: 'center' as 'center', padding: '1rem', color: '#777' },
    error: { textAlign: 'center' as 'center', padding: '1rem', color: 'red' },
    noResults: { textAlign: 'center' as 'center', padding: '1rem', color: '#777' },
  };

  return (
    <div style={styles.container}>
      {/* Replace with your Input component if available */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search users by name or username..."
        style={styles.input}
        // disabled={loading} // Optionally disable while loading global auth or initial search
      />

      {loading && <div style={styles.loading}>Loading...</div> /* Replace with <Loader2 /> */}
      {error && <div style={styles.error}>Error: {error}</div>}
      
      {!loading && !error && searchResults.length === 0 && inputValue.trim() !== '' && (
        <div style={styles.noResults}>No users found matching "{inputValue}".</div>
      )}

      {!loading && !error && searchResults.length > 0 && (
        <ul style={styles.resultsList}>
          {searchResults.map((user) => (
            <li 
              key={user.id} 
              style={styles.listItem} 
              onClick={() => onSelectUser(user)}
              onKeyPress={(e) => e.key === 'Enter' && onSelectUser(user)} // Accessibility
              tabIndex={0} // Accessibility
            >
              {/* Replace with your Avatar component */}
              <div style={styles.avatar}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} style={styles.avatarImage} />
                ) : (
                  <div style={styles.avatarFallback}>
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div style={styles.userInfo}>
                <span style={styles.fullName}>{user.fullName}</span>
                {user.tiktokUsername && <span style={styles.username}>@{user.tiktokUsername}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

