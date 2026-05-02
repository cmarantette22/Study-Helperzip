import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, Copy, Check, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-800 to-indigo-900 p-8 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white">Study Buddy</h1>
          <p className="text-blue-200 text-sm mt-1">Reset your password</p>
        </div>
        <CardContent className="p-8">
          {!resetLink ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-slate-500">
                Enter the email address for your account and we'll generate a reset link for you.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Reset Link
              </Button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-emerald-700 font-medium text-sm mb-1">Your reset link is ready</p>
                <p className="text-emerald-600 text-xs">This link expires in 1 hour and can only be used once.</p>
              </div>
              <div className="space-y-2">
                <Label>Reset link</Label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={resetLink}
                    className="flex-1 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={copyLink} className="flex-shrink-0 gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <Button className="w-full h-11" onClick={() => window.location.href = resetLink}>
                Open Reset Link
              </Button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
