
'use client';

import type { ReactNode } from 'react';
import BottomNav from '@/components/layout/bottom-nav';
import SidebarNav from '@/components/layout/sidebar-nav';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user: userProfile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading user session...</p>
      </div>
    );
  }

  // Layout for ALL users (previously default layout for non-admin users)
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav /> {/* Shown on md and larger screens */}
      <main className="md:pl-60">
        <div className="pb-16 md:pb-0"> {/* Padding for bottom nav on mobile */}
          {children}
        </div>
      </main>
      <BottomNav /> {/* Shown on screens smaller than md */}
    </div>
  );
}
