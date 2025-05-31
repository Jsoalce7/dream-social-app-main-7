
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X, Zap, LayoutDashboard, Users, Settings, Home, MessagesSquare, ShieldCheck, Swords, UserCircle } from 'lucide-react';
import type { NavItem } from '@/types';
import { cn } from '@/lib/utils';

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/dashboard/users', label: 'User Management', icon: Users },
  // Add other admin specific links here e.g., settings
  // { href: '/admin/settings', label: 'Settings', icon: Settings }, 
];

const mainNavItems: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessagesSquare },
  { href: '/battles', label: 'Battles', icon: Swords },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export default function AdminMobileNav() {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem, isInsideSheet: boolean = true) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href);
    const LinkContent = (
      <Link href={item.href} className={cn(
        'flex items-center p-3 rounded-md text-sm font-medium',
        isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
      )}>
        <item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-primary-foreground' : 'text-primary')} aria-hidden="true" />
        {item.label}
      </Link>
    );

    if (isInsideSheet) {
      return <SheetClose asChild key={item.href}>{LinkContent}</SheetClose>;
    }
    return LinkContent;
  };

  return (
    // Removed md:hidden from header to make it always visible for admins
    // The SheetTrigger button also had lg:hidden, which should be removed if the hamburger is for all sizes.
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <Link href="/home" className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" />
        <span className="font-semibold text-foreground">ClashSync</span>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          {/* Removed lg:hidden from Button to make hamburger always visible */}
          <Button variant="outline" size="icon"> 
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-xs p-0">
          <div className="flex h-16 shrink-0 items-center border-b px-6">
            <Link href="/home" className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary" />
              <span className="text-lg font-semibold text-foreground">ClashSync</span>
            </Link>
            <SheetClose asChild className="ml-auto">
               <Button variant="ghost" size="icon">
                 <X className="h-5 w-5" />
                 <span className="sr-only">Close menu</span>
                </Button>
            </SheetClose>
          </div>
          <nav className="flex flex-col space-y-1 p-4">
            <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Admin</p>
            {adminNavItems.map(item => renderNavItem(item))}
            <hr className="my-2" />
            <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Main Menu</p>
            {mainNavItems.map(item => renderNavItem(item))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
