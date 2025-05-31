'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  MessagesSquare, // New icon for Messages
  ShieldCheck, 
  Swords, 
  UserCircle, 
  Zap, 
  LayoutDashboard, 
  Users,
  Bell
} from 'lucide-react';
import type { NavItem } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { useBattleRequests } from '@/hooks/use-battle-requests';

const mainNavItemsBase: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home }, 
  { href: '/messages', label: 'Messages', icon: MessagesSquare }, 
  { href: '/leaderboard', label: 'Leaderboard', icon: ShieldCheck },
  { href: '/battles', label: 'Battles', icon: Swords },
  { href: '/battle-requests', label: 'Battle Requests', icon: Bell },
];

const adminSpecificNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
  { href: '/admin/dashboard/users', label: 'User Management', icon: Users },
];

const profileNavItem: NavItem = { href: '/profile', label: 'Profile', icon: UserCircle };

export default function SidebarNav() {
  const pathname = usePathname();
  const { user: userProfile, loading: authLoading } = useAuth();
  const { unreadCount = 0 } = useBattleRequests(); // Default to 0 if undefined

  const renderNavItem = (item: NavItem, liClassName?: string) => {
    const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href)) || (item.href === '/home' && pathname === '/home');
    return (
      <li key={item.href} className={cn(liClassName)}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive ? 'text-primary font-semibold' : 'text-foreground hover:text-primary'
                )}
              >
                <Link href={item.href}>
                  <item.icon className={cn('mr-3 h-5 w-5 shrink-0')} aria-hidden="true" />
                  {item.label}
                  {item.href === '/battle-requests' && unreadCount > 0 && (
                    <span className="ml-3 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {Math.min(9, unreadCount)}{unreadCount > 9 ? '+' : ''}
                    </span>
                  )}
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </li>
    );
  };

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-60 md:flex-col md:border-r bg-card">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Zap className="h-8 w-auto text-primary" />
          <span className="ml-2 text-xl font-semibold text-foreground">ClashSync</span>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-1">
            
            {!authLoading && userProfile && userProfile.role === 'admin' && (
              <>
                {adminSpecificNavItems.map(item => renderNavItem(item))}
              </>
            )}
            
            {mainNavItemsBase.map(item => renderNavItem(item))}
            
            {renderNavItem(profileNavItem, "mt-auto")}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
