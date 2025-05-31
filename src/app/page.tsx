
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
// Removed direct Firestore imports as role now comes from useAuth's userProfile
import type { UserRole } from '@/types';

export default function RootRedirectPage() {
  const { user: userProfile, loading: authLoading } = useAuth(); // user is now userProfile
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return; 
    }

    if (userProfile) {
      const role = userProfile.role as UserRole; // Role comes from userProfile
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/home'); 
      }
    } else {
      // User is not authenticated or profile not loaded
      router.replace('/auth/sign-in');
    }
  }, [userProfile, authLoading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Loading ClashSync...</p>
    </div>
  );
}
