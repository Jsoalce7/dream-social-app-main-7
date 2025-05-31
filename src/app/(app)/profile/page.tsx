
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, UserCircle, Edit3, Save, Mail, Phone, UserSquare2, Diamond } from 'lucide-react'; // Added Diamond icon
import { Badge } from '@/components/ui/badge'; // Added Badge for styling diamonds

export default function ProfilePage() {
  const { user: userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName);
      setPhone(userProfile.phone || '');
      setTiktokUsername(userProfile.tiktokUsername || '');
    }
  }, [userProfile]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
      router.push('/auth/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ title: 'Error', description: 'Failed to sign out.', variant: 'destructive' });
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !userProfile.id) return;
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', userProfile.id);
      await updateDoc(userDocRef, {
        fullName,
        phone,
        tiktokUsername,
      });
      toast({ title: 'Profile Updated', description: 'Your changes have been saved.' });
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-lg text-muted-foreground">Please sign in to view your profile.</p>
        <Button onClick={() => router.push('/auth/sign-in')} className="mt-4">Sign In</Button>
      </div>
    );
  }
  
  const profileInitial = userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : (userProfile.email ? userProfile.email.charAt(0).toUpperCase() : '?');

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-2 border-4 border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
            <AvatarImage src={userProfile.avatarUrl || `https://placehold.co/96x96.png?text=${profileInitial}`} alt={userProfile.fullName} data-ai-hint="profile avatar"/>
            <AvatarFallback className="text-3xl">{profileInitial}</AvatarFallback>
          </Avatar>
          {/* Diamond Count Display */} 
          {userProfile.diamonds !== undefined && (
            <Badge variant="secondary" className="mt-2 mb-2 text-base bg-blue-100 text-blue-700 hover:bg-blue-100/90 px-4 py-1.5 rounded-full shadow">
              <Diamond className="mr-2 h-5 w-5 text-blue-500" />
              {userProfile.diamonds.toLocaleString()}
            </Badge>
          )}
          {!isEditing && (
            <>
            <CardTitle className="text-3xl font-bold mt-2">{userProfile.fullName}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {userProfile.tiktokUsername ? `@${userProfile.tiktokUsername}` : 'TikTok username not set'}
            </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
             <form onSubmit={handleSaveChanges} className="space-y-4">
              <div>
                <Label htmlFor="fullNameEdit">Full Name</Label>
                <Input id="fullNameEdit" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="tiktokUsernameEdit">TikTok @username</Label>
                <Input id="tiktokUsernameEdit" value={tiktokUsername} onChange={(e) => setTiktokUsername(e.target.value)} className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="phoneEdit">Phone</Label>
                <Input id="phoneEdit" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1"/>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
              </div>
            </form>
          ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center">
                <UserCircle className="mr-3 h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Full Name:</span>
                <span className="ml-2 font-medium">{userProfile.fullName}</span>
              </div>
              <div className="flex items-center">
                <Mail className="mr-3 h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2 font-medium">{userProfile.email}</span>
              </div>
              <div className="flex items-center">
                <UserSquare2 className="mr-3 h-5 w-5 text-primary" />
                <span className="text-muted-foreground">TikTok:</span>
                <span className="ml-2 font-medium">{userProfile.tiktokUsername || 'Not set'}</span>
              </div>
              <div className="flex items-center">
                <Phone className="mr-3 h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="ml-2 font-medium">{userProfile.phone || 'Not set'}</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full mt-4">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={handleSignOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
