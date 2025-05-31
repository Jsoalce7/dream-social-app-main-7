
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  MessagesSquare, // New icon for Messages
  ShieldCheckIcon, 
  SwordsIcon, 
  UserCircleIcon 
} from 'lucide-react';
import type { NavItem } from '@/types';
import { cn } from '@/lib/utils';

const navItems: NavItem[] = [
  { href: '/home', label: 'Home', icon: HomeIcon }, // Old Community is now Home
  { href: '/messages', label: 'Messages', icon: MessagesSquare }, // New Messages tab
  { href: '/leaderboard', label: 'Leaderboard', icon: ShieldCheckIcon },
  { href: '/battles', label: 'Battles', icon: SwordsIcon },
  { href: '/profile', label: 'Profile', icon: UserCircleIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-t-lg md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href));
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-md transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <IconComponent className={cn('h-6 w-6 mb-0.5', isActive ? 'fill-primary stroke-primary-foreground' : '')} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
