
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminConfig, UserProfile, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Users, ListChecks, Edit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
      const { id, ...configToSave } = config;
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


const UserManagementTable = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const { toast } = useToast();
  const availableRoles: UserRole[] = ['creator', 'coach', 'admin', 'user'];

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollectionRef);
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: 'Error', description: 'Could not fetch users list.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSavingRoleId(userId);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { role: newRole });
      toast({ title: 'Role Updated', description: `User role changed to ${newRole}.` });
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditingRoleUserId(null); // Close select after saving
    } catch (error) {
      console.error("Error updating role:", error);
      toast({ title: 'Error', description: 'Could not update user role.', variant: 'destructive' });
    } finally {
      setSavingRoleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-2 text-muted-foreground">Loading Users...</p>
      </div>
    );
  }
  
  return (
     <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>User Management</CardTitle>
        <CardDescription>View all registered users and manage their roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>TikTok</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${user.fullName?.charAt(0)}`} alt={user.fullName} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.fullName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.tiktokUsername ? `@${user.tiktokUsername}` : 'N/A'}</TableCell>
                <TableCell className="text-center">
                  {editingRoleUserId === user.id ? (
                    <Select
                      defaultValue={user.role || 'user'}
                      onValueChange={(newRole) => handleRoleChange(user.id, newRole as UserRole)}
                      disabled={savingRoleId === user.id}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(role => (
                          <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      variant={user.role === 'admin' ? 'default' : user.role === 'coach' ? 'secondary' : 'outline'} 
                      className={user.role === 'admin' ? 'bg-accent text-accent-foreground' : user.role === 'coach' ? 'bg-blue-500 text-white' : ''}
                    >
                      {user.role || 'N/A'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {savingRoleId === user.id ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingRoleUserId === user.id ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingRoleUserId(null)}>Cancel</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditingRoleUserId(user.id)}>
                      <Edit className="mr-1 h-3 w-3" /> Edit Role
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
             {users.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No users found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your ClashSync application settings and users.</p>
      </div>
      <AdminConfigForm />
      <Separator className="my-8" />
      <UserManagementTable />
    </div>
  );
}

