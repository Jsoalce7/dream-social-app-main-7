import type { ReactNode } from 'react';
import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="mb-8 flex items-center text-3xl font-bold text-primary">
        <Zap className="mr-2 h-10 w-10" />
        ClashSync
      </div>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl md:p-8">
        {children}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ready to battle? Sign in to continue.
      </p>
    </div>
  );
}
