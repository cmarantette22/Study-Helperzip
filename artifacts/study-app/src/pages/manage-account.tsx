import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft, Mail, Lock, Trash2, User, AtSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ManageAccount() {
  const { user, refetchUser, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [profileForm, setProfileForm] = useState({
    school: user?.school || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
  });
  const [emailForm, setEmailForm] = useState({ email: user?.email || "", password: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch(`${BASE}/api/account/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      await refetchUser();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const res = await fetch(`${BASE}/api/account/email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update email");
      toast({ title: "Email updated successfully" });
      setEmailForm((f) => ({ ...f, password: "" }));
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${BASE}/api/account/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      toast({ title: "Password updated successfully" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${BASE}/api/account`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      await logout();
      navigate("/login");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-xl mx-auto py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Manage Account</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Public Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profileForm.avatar || undefined} alt={user?.name} />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{user?.name}</p>
                {user?.handle && (
                  <p className="text-sm text-primary/80 flex items-center gap-1 mt-0.5">
                    <AtSign className="w-3.5 h-3.5" />
                    {user.handle}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {user?.handle && (
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={user.handle}
                      readOnly
                      className="h-10 pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Username cannot be changed after signup.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  id="avatar"
                  type="url"
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm((f) => ({ ...f, avatar: e.target.value }))}
                  placeholder="https://example.com/photo.jpg"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">School / Program <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  id="school"
                  value={profileForm.school}
                  onChange={(e) => setProfileForm((f) => ({ ...f, school: e.target.value }))}
                  placeholder="e.g. State University — Computer Science"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About Me <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell the community a bit about yourself…"
                  className="resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-slate-400 text-right">{profileForm.bio.length}/300</p>
              </div>

              <Button type="submit" disabled={profileLoading} size="sm">
                {profileLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" /> Update Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-password">Current Password</Label>
                <Input
                  id="email-password"
                  type="password"
                  value={emailForm.password}
                  onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Confirm with your password"
                  className="h-10"
                  required
                />
              </div>
              <Button type="submit" disabled={emailLoading} size="sm">
                {emailLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Email
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" /> Update Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pw">Current Password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="At least 6 characters"
                  className="h-10"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
              <Button type="submit" disabled={passwordLoading} size="sm">
                {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Delete Card */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <Trash2 className="w-4 h-4" /> Delete Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleteLoading}>
                  {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all your study projects. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteAccount}>
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
