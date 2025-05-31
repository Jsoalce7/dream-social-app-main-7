
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Textarea } from "@/components/ui/textarea"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Calendar } from "@/components/ui/calendar"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; 
import { format } from "date-fns"; 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";


import { Loader2, CheckCircle2, XCircle, Edit, AlertTriangle, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Battle, ModificationRequest, UserProfile } from '@/types'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper function to safely get data from Firestore doc
const getUserProfileFromRef = async (userRefPath: string): Promise<UserProfile> => {
  const userDocRef = doc(db, userRefPath);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as UserProfile;
  }
  console.warn(`User document not found for ref: ${userRefPath}`);
  return { id: userRefPath.split('/').pop() || 'unknown', fullName: 'Unknown User', email: '', avatarUrl: `https://placehold.co/40x40.png?text=U` };
};

// Helper to fetch battle details
const getBattleDetails = async (battleId: string): Promise<Battle | null> => {
  const battleDocRef = doc(db, 'battles', battleId);
  const battleSnap = await getDoc(battleDocRef);
  if (battleSnap.exists()) {
     const battleData = battleSnap.data();
     
      let creatorARefPath: string | undefined;
      if (battleData.creatorARef) {
        if (typeof battleData.creatorARef === 'string') {
          creatorARefPath = battleData.creatorARef;
        } else if (battleData.creatorARef.path && typeof battleData.creatorARef.path === 'string') {
          creatorARefPath = battleData.creatorARef.path;
        }
      }

      let creatorBRefPath: string | undefined;
      if (battleData.creatorBRef) {
        if (typeof battleData.creatorBRef === 'string') {
          creatorBRefPath = battleData.creatorBRef;
        } else if (battleData.creatorBRef.path && typeof battleData.creatorBRef.path === 'string') {
          creatorBRefPath = battleData.creatorBRef.path;
        }
      }

      if (!creatorARefPath || !creatorBRefPath) {
        console.warn(
          `Battle document ${battleSnap.id} is missing valid creatorARef or creatorBRef or they are malformed. Skipping.`,
          { creatorARef: battleData.creatorARef, creatorBRef: battleData.creatorBRef }
        );
        return null;
      }
      
      const creatorA = await getUserProfileFromRef(creatorARefPath);
      const creatorB = await getUserProfileFromRef(creatorBRefPath);

       const dateTime = (battleData.dateTime as Timestamp).toDate();

      return {
        id: battleSnap.id,
        creatorA,
        creatorB,
        dateTime,
        mode: battleData.mode,
        status: battleData.status,
        requestedBy: battleData.requestedBy,
      };
  }
  return null;
};

export default function ModificationRequestsPage() {
  const [requests, setRequests] = useState<ModificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ModificationRequest | null>(null);
  const [editedChanges, setEditedChanges] = useState<any>({});
  const { toast } = useToast();

  const fetchModificationRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'modificationRequests'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const fetchedRequests: ModificationRequest[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
         const battleDetails = await getBattleDetails(data.battleId);

        if (!battleDetails) {
             console.warn(`Could not fetch battle details for request ${docSnap.id}. Skipping.`);
             continue; 
         }
        
         const requestedByUser = await getUserProfileFromRef(data.requestedByRef.path); 

        fetchedRequests.push({
          id: docSnap.id,
          battleId: data.battleId,
          proposedChanges: data.proposedChanges,
          status: data.status,
          requestedAt: (data.requestedAt as Timestamp).toDate(),
          requestedByRef: data.requestedByRef, 
          requestedByUser, 
          battleDetails, 
        } as ModificationRequest);
      }
      setRequests(fetchedRequests);
    } catch (err: any) {
      console.error("Error fetching modification requests: ", err);
      setError(err.message || 'Failed to load modification requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModificationRequests();
  }, []);

  const handleApprove = async (request: ModificationRequest) => {
    try {
      const battleDocRef = doc(db, 'battles', request.battleId);
      await updateDoc(battleDocRef, request.proposedChanges);

      const requestDocRef = doc(db, 'modificationRequests', request.id);
      await updateDoc(requestDocRef, { status: 'approved' });

      toast({ title: 'Request Approved', description: 'Battle updated successfully.' });
      fetchModificationRequests(); 
    } catch (err: any) {
      console.error("Error approving request: ", err);
      toast({ title: 'Approval Failed', description: err.message || 'Could not approve modification request.', variant: 'destructive' });
    }
  };

  const handleDeny = async (request: ModificationRequest) => {
    try {
      const requestDocRef = doc(db, 'modificationRequests', request.id);
      await updateDoc(requestDocRef, { status: 'denied' });

      toast({ title: 'Request Denied', description: 'Modification request has been denied.' });
      fetchModificationRequests(); 
    } catch (err: any) {
       console.error("Error denying request: ", err);
      toast({ title: 'Denial Failed', description: err.message || 'Could not deny modification request.', variant: 'destructive' });
    }
  };

  const handleEditClick = (request: ModificationRequest) => {
    setSelectedRequest(request);
    const initialChanges: any = {};
    for (const key in request.proposedChanges) {
        if (request.proposedChanges[key] instanceof Timestamp) {
            initialChanges[key] = (request.proposedChanges[key] as Timestamp).toDate();
        } else {
            initialChanges[key] = request.proposedChanges[key];
        }
    }
    setEditedChanges(initialChanges);
    setIsModalOpen(true);
  };

    const handleEditAndApprove = async () => {
        if (!selectedRequest) return;

        try {
            const changesToApply: any = {};
             for (const key in editedChanges) {
                 if (key === 'dateTime' && editedChanges[key] instanceof Date) {
                    changesToApply[key] = Timestamp.fromDate(editedChanges[key]);
                 } else {
                     changesToApply[key] = editedChanges[key];
                 }
             }

            const battleDocRef = doc(db, 'battles', selectedRequest.battleId);
            await updateDoc(battleDocRef, changesToApply);

            const requestDocRef = doc(db, 'modificationRequests', selectedRequest.id);
            await updateDoc(requestDocRef, { status: 'approved' });

            toast({ title: 'Request Edited & Approved', description: 'Battle updated successfully with edited changes.' });
            setIsModalOpen(false);
            fetchModificationRequests(); 
        } catch (err: any) {
            console.error("Error editing and approving request: ", err);
            toast({ title: 'Edit & Approve Failed', description: err.message || 'Could not edit and approve modification request.', variant: 'destructive' });
        }
    };


  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Requests</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">Modification Requests</h1>

      {requests.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No pending modification requests found.</p>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle>Request from {request.requestedByUser?.fullName || 'Unknown User'}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline">Status: {request.status}</Badge>
                  <span>{new Date(request.requestedAt).toLocaleString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.battleDetails ? (
                    <div className="mb-4">
                        <h3 className="font-semibold mb-2">Current Battle Details:</h3>
                        <p className="text-sm"><strong>ID:</strong> {request.battleDetails.id}</p>
                         <p className="text-sm"><strong>Participants:</strong> {request.battleDetails.creatorA.fullName} vs {request.battleDetails.creatorB.fullName}</p>
                        <p className="text-sm"><strong>Date/Time:</strong> {new Date(request.battleDetails.dateTime).toLocaleString()}</p>
                         <p className="text-sm"><strong>Mode:</strong> {request.battleDetails.mode}</p>
                    </div>
                 ) : (
                    <Alert variant="default" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Battle Details Unavailable</AlertTitle>
                        <AlertDescription>Could not load details for battle ID: {request.battleId}.</AlertDescription>
                    </Alert>
                 )}

                <h3 className="font-semibold mb-2">Originally Proposed Changes:</h3>
                {Object.entries(request.proposedChanges).map(([key, value]) => (
                    <p key={key} className="ml-4 text-sm text-muted-foreground"><strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {value instanceof Timestamp ? value.toDate().toLocaleString() : String(value)}</p>
                ))}

                <Separator className="my-4" />

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => handleApprove(request)} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Original
                  </Button>
                  <Button onClick={() => handleEditClick(request)} size="sm" variant="outline">
                       <Edit className="mr-2 h-4 w-4" /> Edit & Approve
                   </Button>
                  <Button onClick={() => handleDeny(request)} size="sm" variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" /> Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Modification Request</DialogTitle>
            <DialogDescription>
              Review and edit the proposed changes. Original values from the request are shown for reference.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {selectedRequest?.battleDetails && (
                <div className="mb-4 p-4 border rounded-md bg-muted/50">
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Original Battle State:</h3>
                     <p className="text-xs"><strong>Date/Time:</strong> {new Date(selectedRequest.battleDetails.dateTime).toLocaleString()}</p>
                     <p className="text-xs"><strong>Mode:</strong> {selectedRequest.battleDetails.mode}</p>
                </div>
            )}

            <h3 className="font-semibold mb-2">Edit Proposed Changes:</h3>
            {selectedRequest && Object.entries(editedChanges).map(([key, currentValue]) => {
              const originalProposedValue = selectedRequest.proposedChanges[key];
              const displayOriginalValue = originalProposedValue instanceof Timestamp ? originalProposedValue.toDate().toLocaleString() : String(originalProposedValue);
              
              return (
                <div key={key} className="grid grid-cols-1 gap-2 mb-3">
                  <Label htmlFor={key} className="font-medium">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-1">Original proposal: {displayOriginalValue}</p>
                  
                   {key === 'dateTime' ? (
                       <div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={
                                  "w-full justify-start text-left font-normal mb-2"
                                }
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editedChanges[key] ? format(editedChanges[key] as Date, "PPP HH:mm") : "Pick a date and time"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editedChanges[key] as Date}
                                onSelect={(date) => {
                                    const newDate = date ? date : new Date();
                                    // Preserve existing time if only date is changed
                                    const currentTime = editedChanges[key] instanceof Date ? editedChanges[key] : new Date();
                                    newDate.setHours(currentTime.getHours());
                                    newDate.setMinutes(currentTime.getMinutes());
                                    setEditedChanges({ ...editedChanges, [key]: newDate });
                                }}
                                initialFocus
                              />
                                <Input
                                    type="time"
                                    value={editedChanges[key] instanceof Date ? format(editedChanges[key] as Date, 'HH:mm') : ''}
                                     onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const date = editedChanges[key] instanceof Date ? new Date(editedChanges[key]) : new Date();
                                        date.setHours(hours, minutes);
                                        setEditedChanges({ ...editedChanges, [key]: date });
                                     }}
                                    className="mt-2 p-2 border rounded"
                                />
                            </PopoverContent>
                          </Popover>
                       </div>
                   ) : key === 'mode' ? (
                        <div>
                            <Select onValueChange={(value) => setEditedChanges({ ...editedChanges, [key]: value })} value={String(currentValue)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1v1">1v1</SelectItem>
                                    <SelectItem value="2v2">2v2</SelectItem>
                                    <SelectItem value="Free For All">Free For All</SelectItem>
                                    <SelectItem value="Tournament Bracket">Tournament Bracket</SelectItem>
                                    {/* Add other relevant modes */}
                                </SelectContent>
                            </Select>
                        </div>
                   ) : key === 'notes' || (typeof currentValue === 'string' && currentValue.length > 50) ? ( 
                        <Textarea
                            id={key}
                            value={String(currentValue)}
                            onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
                            rows={3}
                        />
                   ) : (
                       <Input
                            id={key}
                            value={String(currentValue)}
                            onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
                        />
                   )}
                </div>
            )})
          }
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditAndApprove}><CheckCircle2 className="mr-2 h-4 w-4" /> Save & Approve Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
