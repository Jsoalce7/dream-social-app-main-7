
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Edit, Diamond, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";


const UserManagementTable = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [currentDiamonds, setCurrentDiamonds] = useState<number>(0);
  const { toast } = useToast();
  const availableRoles: UserRole[] = ['creator', 'coach', 'admin', 'user'];

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollectionRef);
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        // Initialize diamonds to 0 if not present
        const userData = doc.data();
        fetchedUsers.push({ 
          id: doc.id, 
          ...userData, 
          diamonds: userData.diamonds === undefined ? 0 : userData.diamonds 
        } as UserProfile);
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

  const handleSaveUser = async (userId: string, newRole: UserRole, newDiamonds: number) => {
    setSavingUserId(userId);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { 
        role: newRole,
        diamonds: Number(newDiamonds) // Ensure diamonds is a number
      });
      toast({ title: 'User Updated', description: `User details for ${userId} updated.` });
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole, diamonds: newDiamonds } : u));
      setEditingUserId(null); 
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: 'Error', description: 'Could not update user details.', variant: 'destructive' });
    } finally {
      setSavingUserId(null);
    }
  };
  
  const openEditModal = (user: UserProfile) => {
    setEditingUserId(user.id);
    setCurrentDiamonds(user.diamonds || 0);
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
        <CardTitle className="text-xl flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>User Accounts</CardTitle>
        <CardDescription>View all registered users and manage their roles and diamond counts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Diamonds</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${user.fullName?.charAt(0)}`} alt={user.fullName || 'User'} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.fullName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-center">
                    <Badge 
                      variant={user.role === 'admin' ? 'default' : user.role === 'coach' ? 'secondary' : 'outline'} 
                      className={user.role === 'admin' ? 'bg-accent text-accent-foreground' : user.role === 'coach' ? 'bg-blue-500 text-white' : ''}
                    >
                      {user.role || 'user'}
                    </Badge>
                </TableCell>
                <TableCell className="text-center flex items-center justify-center">
                  <Diamond className="h-4 w-4 mr-1 text-blue-400" /> {user.diamonds === undefined ? 0 : user.diamonds}
                </TableCell>
                <TableCell className="text-right">
                    <Dialog open={editingUserId === user.id} onOpenChange={(isOpen) => !isOpen && setEditingUserId(null)}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openEditModal(user)} disabled={savingUserId === user.id}>
                                {savingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="mr-1 h-3 w-3" />} Edit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit User: {user.fullName}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label htmlFor={`role-${user.id}`} className="text-right">Role</label>
                                    <Select
                                        defaultValue={user.role || 'user'}
                                        onValueChange={(newRole) => {
                                            // Temp update for UI consistency, actual save on button click
                                            const tempUsers = users.map(u => u.id === user.id ? {...u, role: newRole as UserRole} : u);
                                            setUsers(tempUsers);
                                        }}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map(role => (
                                            <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label htmlFor={`diamonds-${user.id}`} className="text-right">Diamonds</label>
                                    <Input 
                                        id={`diamonds-${user.id}`} 
                                        type="number" 
                                        value={currentDiamonds} 
                                        onChange={(e) => setCurrentDiamonds(Number(e.target.value))}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button 
                                    onClick={() => handleSaveUser(user.id, users.find(u=>u.id === user.id)?.role || 'user', currentDiamonds)} 
                                    disabled={savingUserId === user.id}
                                >
                                    {savingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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

export default function AdminUserManagementPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage user roles and diamond counts for the ClashSync application.</p>
      </div>
      <UserManagementTable />
    </div>
  );
}
