'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Users, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RequestBattleOptions() {
  const router = useRouter();

  const handleOptionSelect = (type: 'direct' | 'open') => {
    router.push(`/battles/request?type=${type}`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-shadow">
          <PlusCircle className="mr-2 h-5 w-5" />
          Request Battle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Battle Request Type</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card className="cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => handleOptionSelect('direct')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Direct Battle
              </CardTitle>
              <CardDescription>
                Challenge a specific user to a one-on-one battle
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => handleOptionSelect('open')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Open Battle
              </CardTitle>
              <CardDescription>
                Create an open challenge that any user can accept
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
