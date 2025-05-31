
'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ListChecks } from 'lucide-react';
// UserManagementTable and related imports are removed as it's moving to its own page.

const AdminConfigForm = () => {
  const [config, setConfig] = useState<AdminConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const configDocRef = doc(db, 'admin', 'config');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig({ id: docSnap.id, ...docSnap.data() } as AdminConfig);
      } else {
        // Initialize with default values if config doesn't exist
        setConfig({
          homepageTitle: 'Welcome to ClashSync!',
          homepageBannerURL: 'https://placehold.co/1200x400.png?text=Default+Banner',
          enableBattles: true,
          enableEvents: true,
          enableCommunityChat: true,
        });
        toast({ title: 'Admin Config Initialized', description: 'Default settings applied. You can customize them now.', variant: 'default' });
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching admin config:", error);
      toast({ title: 'Error', description: 'Could not load admin configuration.', variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: keyof AdminConfig, checked: boolean) => {
    setConfig(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { id, ...configToSave } = config; // Exclude 'id' if it's part of the state but not a field in Firestore doc
      await setDoc(configDocRef, configToSave, { merge: true });
      toast({ title: 'Settings Saved', description: 'Admin configuration updated successfully.' });
    } catch (error) {
      console.error("Error saving admin config:", error);
      toast({ title: 'Save Failed', description: 'Could not save admin settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading Configuration...</p>
      </div>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>App Configuration</CardTitle>
        <CardDescription>Manage global application settings and feature flags from here.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="homepageTitle">Homepage Title</Label>
            <Input id="homepageTitle" name="homepageTitle" value={config.homepageTitle || ''} onChange={handleInputChange} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="homepageBannerURL">Homepage Banner URL</Label>
            <Input id="homepageBannerURL" name="homepageBannerURL" value={config.homepageBannerURL || ''} onChange={handleInputChange} className="mt-1" />
            {config.homepageBannerURL && <img src={config.homepageBannerURL} alt="Banner Preview" data-ai-hint="website banner" className="mt-2 rounded-md max-h-40 object-contain border" />}
          </div>
          
          <div className="space-y-3 pt-2">
             <h3 className="text-md font-medium text-foreground mb-1">Feature Toggles</h3>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="enableBattles" className="text-base">Enable Battles Feature</Label>
                <p className="text-xs text-muted-foreground">Allow users to request and participate in battles.</p>
              </div>
              <Switch id="enableBattles" checked={config.enableBattles || false} onCheckedChange={(checked) => handleSwitchChange('enableBattles', checked)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="enableEvents" className="text-base">Enable Events Feature</Label>
                <p className="text-xs text-muted-foreground">Show the Events tab and allow event registration.</p>
              </div>
              <Switch id="enableEvents" checked={config.enableEvents || false} onCheckedChange={(checked) => handleSwitchChange('enableEvents', checked)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="enableCommunityChat" className="text-base">Enable Community Chat</Label>
                 <p className="text-xs text-muted-foreground">Activate the community chat functionality.</p>
              </div>
              <Switch id="enableCommunityChat" checked={config.enableCommunityChat || false} onCheckedChange={(checked) => handleSwitchChange('enableCommunityChat', checked)} />
            </div>
          </div>

        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Configuration
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};


export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your ClashSync application settings.</p>
      </div>
      <AdminConfigForm />
      {/* UserManagementTable is now on its own page /admin/dashboard/users */}
    </div>
  );
}
