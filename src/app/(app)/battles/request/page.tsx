import RequestBattleForm from '@/components/battles/request-battle-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RequestBattlePage() {
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/battles">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Battles
        </Link>
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Request New Battle</CardTitle>
          <CardDescription>
            Challenge an opponent by filling out the details below. They will be notified to accept or decline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestBattleForm />
        </CardContent>
      </Card>
    </div>
  );
}
