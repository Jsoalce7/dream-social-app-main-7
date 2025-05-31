
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import {
  Loader2,
  LayoutDashboard,
  Users,
  LogOutIcon,
  Home, // Changed from MessageSquare
  MessagesSquare, // New icon for Messages
  ShieldCheck,

  // CalendarDays, // Removed Events icon
  Swords,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

// Define main navigation items consistent with sidebar-nav.tsx
const mainAppNavItems: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home }, // Old Community is now Home
  { href: '/messages', label: 'Messages', icon: MessagesSquare }, // New Messages tab
  { href: '/leaderboard', label: 'Leaderboard', icon: ShieldCheck },
  { href: '/battles', label: 'Battles', icon: Swords },
];

const profileNavItem: NavItem = { href: '/profile', label: 'Profile', icon: UserCircle };


export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user: userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast({ title: 'Signed Out', description: 'Successfully signed out from admin panel.' });
      router.push('/auth/sign-in');
    } catch (error) {
      toast({ title: 'Sign Out Failed', description: 'Could not sign out.', variant: 'destructive' });
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-muted/20">
        <Sidebar className="border-r" collapsible="icon">
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" /> {/* Mobile toggle */}
              <Link href="/admin/dashboard" className="text-lg font-semibold text-primary whitespace-nowrap">Admin Panel</Link>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2 flex-grow">
            <SidebarMenu className="flex flex-col h-full">
              {/* Admin Specific Links */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard'}>
                  <Link href="/admin/dashboard"><LayoutDashboard /> Dashboard</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/users'}>
                  <Link href="/admin/dashboard/users"><Users /> User Management</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarSeparator className="my-2" />

              {/* Main Application Links */}
              {mainAppNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}><item.icon /> {item.label}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Spacer to push profile and sign out to bottom */}
              <div className="flex-grow"></div>

              <SidebarSeparator className="my-2" />
              
              {/* Profile Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === profileNavItem.href}>
                  <Link href={profileNavItem.href}><profileNavItem.icon /> {profileNavItem.label}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
              <LogOutIcon className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="md:hidden flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Admin</h1>
            <SidebarTrigger />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
