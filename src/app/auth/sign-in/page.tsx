
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react'; // Added Loader2
import type { UserProfile, UserRole } from '@/types';

// Helper function to create or update user profile in Firestore
const updateUserProfile = async (user: import('firebase/auth').User, additionalData: Partial<UserProfile> = {}) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  let profileData: UserProfile = {
    id: user.uid,
    email: user.email || '',
    fullName: user.displayName || additionalData.fullName || 'New User',
    avatarUrl: user.photoURL || `https://placehold.co/96x96.png?text=${(user.displayName || additionalData.fullName || 'N').charAt(0)}`,
    role: 'creator' as UserRole, // Default role
    createdAt: serverTimestamp() as any, // Firestore will convert this
    ...additionalData,
  };

  if (userDocSnap.exists()) {
    // User document exists, update it but preserve existing role if not explicitly changing
    // and ensure critical fields are not overwritten by provider if blank
    const existingData = userDocSnap.data() as UserProfile;
    profileData = {
      ...existingData, // Preserve existing data
      id: user.uid, // Ensure ID is correct
      email: user.email || existingData.email, // Update email if changed
      fullName: user.displayName || additionalData.fullName || existingData.fullName,
      avatarUrl: user.photoURL || existingData.avatarUrl || `https://placehold.co/96x96.png?text=${(user.displayName || additionalData.fullName || existingData.fullName || 'N').charAt(0)}`,
      role: existingData.role || ('creator' as UserRole), // Preserve existing role, or default
      ...additionalData, // Apply any explicit additional data
    };
    await setDoc(userDocRef, profileData, { merge: true });
    return profileData; // Return the merged profile
  } else {
    // New user, set the profile data
    await setDoc(userDocRef, profileData);
    return profileData; // Return the new profile
  }
};


export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // For sign-up
  const [phone, setPhone] = useState(''); // For sign-up
  const [tiktokUsername, setTiktokUsername] = useState(''); // For sign-up
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthRedirect = (role?: UserRole) => {
    if (role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/home'); // Default for non-admins
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let userCredential;
      let userRole: UserRole = 'creator';

      if (isSignUp) {
        if (!fullName || !email || !password || !tiktokUsername) {
          setError("Full name, email, password, and TikTok username are required for sign up.");
          setIsLoading(false);
          return;
        }
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const profile = await updateUserProfile(user, { fullName, phone, tiktokUsername, role: 'creator' });
        userRole = profile.role || 'creator';
        toast({ title: 'Account Created', description: 'Successfully signed up!' });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Fetch role after sign-in
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          userRole = userDocSnap.data().role || 'creator';
        } else {
          // Should not happen if user exists, but as a fallback, create profile
          const profile = await updateUserProfile(user, {role: 'creator'});
          userRole = profile.role || 'creator';
        }
        toast({ title: 'Signed In', description: 'Welcome back!' });
      }
      handleAuthRedirect(userRole);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      toast({
        title: 'Authentication Failed',
        description: err.message || 'Please check your credentials or sign up.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const profile = await updateUserProfile(user); // Creates user doc with default role 'creator' if new
      toast({ title: 'Signed In with Google', description: `Welcome, ${user.displayName}!` });
      handleAuthRedirect(profile.role);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
      toast({
        title: 'Google Sign-In Failed',
        description: err.message || 'Could not sign in with Google.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTikTokSignIn = () => {
    toast({
      title: 'TikTok Sign-In',
      description: 'TikTok Sign-In is not yet implemented.',
    });
  };


  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {isSignUp ? 'Create an Account' : 'Sign In to ClashSync'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp ? 'Enter your details to join the battle.' : 'Enter your credentials to access your account.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-4">
        {isSignUp && (
          <>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required={isSignUp} className="mt-1" />
            </div>
             <div>
              <Label htmlFor="tiktokUsername">TikTok @username</Label>
              <Input id="tiktokUsername" type="text" value={tiktokUsername} onChange={(e) => setTiktokUsername(e.target.value)} placeholder="@yourtiktok" required={isSignUp} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="123-456-7890" className="mt-1" />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1" />
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
        </Button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      
      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.7 512 244 512 110.3 512 0 398.8 0 256S110.3 0 244 0c69.9 0 129.4 28.7 172.4 72.8L381.9 154.6c-26.3-25.2-62.3-42.2-104.3-42.2-83.1 0-151.4 67.7-151.4 151.3s68.2 151.3 151.4 151.3c57.1 0 100.3-24.5 126.4-50.4 22.3-22.1 34.4-52.8 37.9-90.7H244V261.8z"></path></svg>
        }
        Sign In with Google
      </Button>
      <Button variant="outline" className="w-full" onClick={handleTikTokSignIn} disabled={true /*isLoading*/}>
        Sign In with TikTok (Coming Soon)
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <Button variant="link" onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="p-0 h-auto font-semibold text-primary">
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </Button>
      </p>
    </div>
  );
}
