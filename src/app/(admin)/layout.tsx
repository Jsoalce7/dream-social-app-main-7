'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import SidebarNav from '@/components/layout/sidebar-nav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user: userProfile, loading: authLoading } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifyingRole, setIsVerifyingRole] = useState(true); 

  useEffect(() => {
    if (authLoading) { 
      setIsVerifyingRole(true);
      return;
    }

    if (!userProfile) {
      router.replace(`/auth/sign-in?from=${encodeURIComponent(window.location.pathname)}`);
      setIsVerifyingRole(false);
      return;
    }

    if (userProfile.role === 'admin') {
      setIsAdmin(true);
    } else {
      toast({ title: 'Access Denied', description: 'You are not authorized to view this page.', variant: 'destructive' });
      router.replace('/home'); 
    }
    setIsVerifyingRole(false);

  }, [userProfile, authLoading, router, toast]);

  if (authLoading || isVerifyingRole) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    // This fallback might be briefly shown if redirection hasn't completed
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild className="mt-6">
          <Link href="/home">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="md:pl-60 p-4">
        {children}
      </main>
    </div>
  );
}
