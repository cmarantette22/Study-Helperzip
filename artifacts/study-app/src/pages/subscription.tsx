import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, PauseCircle, PlayCircle, XCircle, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
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

type SubscriptionInfo = {
  subscription: any;
  planType: string | null;
  subscriptionStatus: string | null;
  pauseDate: string | null;
};

function statusBadge(status: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>;
    case "paused":
      return <Badge className="bg-yellow-100 text-yellow-700 border-0">Paused</Badge>;
    case "canceled":
      return <Badge className="bg-red-100 text-red-700 border-0">Canceled</Badge>;
    default:
      return <Badge variant="secondary">No Subscription</Badge>;
  }
}

export default function Subscription() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [prices, setPrices] = useState<any[]>([]);

  useEffect(() => {
    fetchSubscription();
    fetchPrices();

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast({ title: "Subscription activated!", description: "Welcome to Study Buddy." });
    } else if (params.get("checkout") === "canceled") {
      toast({ title: "Checkout canceled", variant: "destructive" });
    }
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch(`${BASE}/api/stripe/subscription`, { credentials: "include" });
      const data = await res.json();
      setInfo(data);
    } catch {
      toast({ title: "Failed to load subscription", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPrices() {
    try {
      const res = await fetch(`${BASE}/api/stripe/prices`, { credentials: "include" });
      const data = await res.json();
      setPrices(data.data || []);
    } catch {}
  }

  async function doAction(action: string, method = "POST") {
    setActionLoading(action);
    try {
      const res = await fetch(`${BASE}/api/stripe/${action}`, { method, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
      toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} successful` });
      await fetchSubscription();
      refetchUser();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function openPortal() {
    setActionLoading("portal");
    try {
      const res = await fetch(`${BASE}/api/stripe/portal`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Failed to open billing portal", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function startCheckout(planType: "monthly" | "annual") {
    setActionLoading("checkout-" + planType);
    try {
      const interval = planType === "monthly" ? "month" : "year";
      const price = prices.find((p: any) => p.recurring?.interval === interval);
      if (!price) {
        toast({ title: "Price not found for this plan", variant: "destructive" });
        return;
      }
      const res = await fetch(`${BASE}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId: price.price_id, planType }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: err.message || "Checkout failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  const status = info?.subscriptionStatus ?? user?.subscriptionStatus;
  const planType = info?.planType ?? user?.planType;
  const pauseDate = info?.pauseDate;
  const renewalDate = info?.subscription?.current_period_end
    ? new Date(info.subscription.current_period_end * 1000).toLocaleDateString()
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "free") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Button variant="ghost" className="mb-6" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Plan</h1>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Free Tier
                <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Up to 12 projects included
              </div>
              <p className="text-slate-500 text-sm">Upgrade to a paid plan for unlimited projects and priority AI processing.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="p-4 border rounded-xl">
                  <div className="font-semibold mb-1">Monthly</div>
                  <div className="text-xl font-bold text-blue-700 mb-2">$15/month</div>
                  <p className="text-xs text-slate-500 mb-3">Pause or cancel anytime</p>
                  <Button className="w-full" size="sm" onClick={() => startCheckout("monthly")} disabled={!!actionLoading}>
                    {actionLoading === "checkout-monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade Monthly"}
                  </Button>
                </div>
                <div className="p-4 border rounded-xl border-blue-200 bg-blue-50">
                  <div className="font-semibold mb-1">Annual</div>
                  <div className="text-xl font-bold text-blue-700 mb-2">$100/year</div>
                  <p className="text-xs text-slate-500 mb-3">Save $80. No refunds.</p>
                  <Button className="w-full" size="sm" onClick={() => startCheckout("annual")} disabled={!!actionLoading}>
                    {actionLoading === "checkout-annual" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade Annually"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Subscription</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {planType === "monthly" ? "Monthly Plan — $15/month" : planType === "annual" ? "Annual Plan — $100/year" : "No active plan"}
                </p>
                {renewalDate && <p className="text-sm text-slate-500">Renews {renewalDate}</p>}
                {pauseDate && (
                  <p className="text-sm text-yellow-600">
                    Paused on {new Date(pauseDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              {statusBadge(status ?? null)}
            </div>

            {status === "active" && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Full access to all features
              </div>
            )}

            {status === "paused" && (
              <div className="flex items-center gap-2 text-yellow-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                Your account is paused. Resume to regain access.
              </div>
            )}
          </CardContent>
        </Card>

        {(!status || status === "none" || status === "canceled") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Choose a Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="p-4 border rounded-xl">
                  <div className="font-semibold mb-1">Monthly</div>
                  <div className="text-xl font-bold text-blue-700 mb-2">$15/month</div>
                  <p className="text-xs text-slate-500 mb-3">Pause or cancel anytime</p>
                  <Button className="w-full" size="sm" onClick={() => startCheckout("monthly")} disabled={!!actionLoading}>
                    {actionLoading === "checkout-monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe Monthly"}
                  </Button>
                </div>
                <div className="p-4 border rounded-xl border-blue-200 bg-blue-50">
                  <div className="font-semibold mb-1">Annual</div>
                  <div className="text-xl font-bold text-blue-700 mb-2">$100/year</div>
                  <p className="text-xs text-slate-500 mb-3">Save $80. No refunds.</p>
                  <Button className="w-full" size="sm" onClick={() => startCheckout("annual")} disabled={!!actionLoading}>
                    {actionLoading === "checkout-annual" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe Annually"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status && status !== "none" && status !== "canceled" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manage Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === "active" && planType === "monthly" && (
                <Button variant="outline" className="w-full justify-start" onClick={() => doAction("pause")} disabled={!!actionLoading}>
                  {actionLoading === "pause" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PauseCircle className="w-4 h-4 mr-2" />}
                  Pause Subscription
                </Button>
              )}

              {status === "paused" && (
                <Button variant="outline" className="w-full justify-start" onClick={() => doAction("resume")} disabled={!!actionLoading}>
                  {actionLoading === "resume" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                  Resume Subscription
                </Button>
              )}

              <Button variant="outline" className="w-full justify-start" onClick={openPortal} disabled={!!actionLoading}>
                {actionLoading === "portal" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Manage Billing in Stripe Portal
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 border-red-200 hover:border-red-300" disabled={!!actionLoading}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will be canceled immediately. You will lose access to all features. Annual plans are non-refundable.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => doAction("cancel")}>
                      Yes, Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
