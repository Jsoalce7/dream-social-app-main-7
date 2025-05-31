import React, { useState } from 'react';
import { useUserSearch } from '@/hooks/use-user-search';
import type { UserProfile } from '@/types';

interface UserSearchComponentProps {
  onSelectUser: (user: UserProfile) => void;
}

const UserSearchComponent: React.FC<UserSearchComponentProps> = ({ onSelectUser }) => {
  const { searchResults, loading, error, searchUsers } = useUserSearch();
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    searchUsers(value);
  };

  // Basic styling, replace with your actual styling/Tailwind classes
  const styles = {
    container: { padding: '1rem', borderBottom: '1px solid #eee' },
    input: { width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' as 'border-box' },
    resultsList: { listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' as 'auto' },
    listItem: { display: 'flex', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', borderRadius: '4px' },
    avatar: { width: '32px', height: '32px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    userInfo: { display: 'flex', flexDirection: 'column' as 'column' },
    fullName: { fontWeight: 'bold' as 'bold', fontSize: '0.9rem' },
    email: { fontSize: '0.8rem', color: '#555' },
    loading: { textAlign: 'center' as 'center', padding: '0.5rem', color: '#777', fontSize: '0.9rem' },
    error: { textAlign: 'center' as 'center', padding: '0.5rem', color: 'red', fontSize: '0.9rem' },
    noResults: { textAlign: 'center' as 'center', padding: '0.5rem', color: '#777', fontSize: '0.9rem' },
  };

  return (
    <div style={styles.container}>
      <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '0.5rem' }}>User Search</p>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search for users..."
        style={styles.input}
        disabled={loading}
      />

      {loading && <div style={styles.loading}>Searching...</div>}
      {error && <div style={styles.error}>{error}</div>}
      
      {!loading && !error && searchResults.length === 0 && inputValue.trim() !== '' && (
        <div style={styles.noResults}>No users found matching "{inputValue}"</div>
      )}

      {!loading && !error && searchResults.length > 0 && (
        <ul style={styles.resultsList}>
          {searchResults.map((user) => (
            <li 
              key={user.id} 
              style={styles.listItem} 
              onClick={() => onSelectUser(user)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectUser(user)}
              tabIndex={0}
            >
              <div style={styles.avatar}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as 'cover' }} />
                ) : (
                  <span>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
              <div style={styles.userInfo}>
                <span style={styles.fullName}>{user.fullName}</span>
                <span style={styles.email}>{user.email}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserSearchComponent;
