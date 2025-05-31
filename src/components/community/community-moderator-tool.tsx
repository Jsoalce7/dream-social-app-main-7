'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { moderateCommunityMessage, type ModerateCommunityMessageOutput } from '@/ai/flows/community-moderator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MessageCircleWarning, ShieldCheck, ShieldX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const communityGuidelinesDefault = `
1. Be respectful to all members.
2. No hate speech, bullying, or harassment.
3. Keep discussions relevant to the community topics.
4. Do not share personal information of others.
5. No spamming or excessive self-promotion.
`;

const formSchema = z.object({
  message: z.string().min(5, { message: 'Message must be at least 5 characters.' }),
  communityGuidelines: z.string().min(10, { message: 'Community guidelines are required.' }),
});

type CommunityModeratorFormValues = z.infer<typeof formSchema>;

export default function CommunityModeratorTool() {
  const [isLoading, setIsLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState<ModerateCommunityMessageOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CommunityModeratorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      communityGuidelines: communityGuidelinesDefault,
    },
  });

  const onSubmit = async (values: CommunityModeratorFormValues) => {
    setIsLoading(true);
    setModerationResult(null);
    setError(null);
    try {
      const result = await moderateCommunityMessage(values);
      setModerationResult(result);
      toast({ title: 'Moderation Complete', description: 'Message analyzed successfully.' });
    } catch (err) {
      console.error('Moderation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during moderation.';
      setError(errorMessage);
      toast({ title: 'Moderation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <MessageCircleWarning className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Community Moderator Tool</CardTitle>
        </div>
        <CardDescription>
          Analyze messages against community guidelines to ensure a safe environment. This tool uses AI to help identify potential violations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="message">Message to Moderate</Label>
            <Textarea
              id="message"
              placeholder="Enter the message you want to check..."
              {...form.register('message')}
              className="min-h-[100px]"
            />
            {form.formState.errors.message && (
              <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="communityGuidelines">Community Guidelines</Label>
            <Textarea
              id="communityGuidelines"
              {...form.register('communityGuidelines')}
              className="min-h-[150px] text-xs bg-muted/50"
            />
            {form.formState.errors.communityGuidelines && (
              <p className="text-sm text-destructive">{form.formState.errors.communityGuidelines.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Moderate Message'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-4">
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {moderationResult && (
          <div className="w-full space-y-3 rounded-md border p-4 bg-card">
            <h3 className="text-lg font-semibold">Moderation Result:</h3>
            {moderationResult.violatesGuidelines ? (
              <Alert variant="destructive">
                <ShieldX className="h-5 w-5" />
                <AlertTitle className="ml-2">Violation Detected</AlertTitle>
                <AlertDescription className="ml-2 mt-1">{moderationResult.explanation}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                 <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
                <AlertTitle className="ml-2">No Violation Found</AlertTitle>
                <AlertDescription className="ml-2 mt-1">{moderationResult.explanation}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
