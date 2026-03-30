import { useState } from "react";
import { useListUsers, useCreateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { ArrowLeft, UserPlus, Trash2, Loader2, Users, Shield, Copy, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsCreateOpen(false);
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setCreatedUser({
          name: data.name,
          email: data.email,
          tempPassword: data.tempPassword,
        });
      },
      onError: (err: any) => {
        const msg = err?.data?.error || err?.message || "Failed to create user";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDeleteUserId(null);
        toast({ title: "User deleted" });
      },
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;
    createMutation.mutate({ data: { name: newName, email: newEmail, password: newPassword } });
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Email: ${createdUser.email}\nTemporary Password: ${createdUser.tempPassword}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Credentials copied to clipboard" });
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/" className="text-blue-200 hover:text-white text-sm flex items-center mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Study Buddy
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-serif font-bold flex items-center gap-2">
                <Shield className="w-5 h-5" /> User Management
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {users ? `${users.length} users` : "Loading..."}
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {users?.map((u: any) => (
              <Card key={u.id} className="shadow-sm border rounded-xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{u.name}</span>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {u.role}
                        </Badge>
                        {u.mustChangePassword && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Temp password
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {u.role !== "admin" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteUserId(u.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif">Add New User</DialogTitle>
            <DialogDescription>
              Create an account with a temporary password. The user will be prompted to change it on first login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">Name</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempPass" className="text-sm">Temporary Password</Label>
              <div className="relative">
                <Input
                  id="tempPass"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set a temp password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdUser} onOpenChange={() => setCreatedUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-lg font-serif text-center">User Created!</DialogTitle>
            <DialogDescription className="text-center">
              Share these credentials with {createdUser?.name}. They'll be asked to change their password on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-mono font-medium">{createdUser?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Temp Password</span>
              <span className="text-sm font-mono font-medium">{createdUser?.tempPassword}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials} className="w-full">
              <Copy className="w-4 h-4 mr-2" /> Copy Credentials
            </Button>
            <Button onClick={() => setCreatedUser(null)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-serif text-center">Delete User</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserId && deleteMutation.mutate({ id: deleteUserId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
