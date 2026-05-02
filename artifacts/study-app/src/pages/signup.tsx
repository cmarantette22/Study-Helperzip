import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, Check, Tag, AtSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PlanId = "free" | "monthly" | "annual";

const PLANS: { id: PlanId; label: string; price: string; description: string; features: string[]; badge?: string }[] = [
  {
    id: "free",
    label: "Free Tier",
    price: "Free",
    description: "No credit card required. Get started today.",
    features: ["Up to 12 Projects", "AI Question Parsing", "Smart Quiz Mode", "Progress Tracking"],
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$15/month",
    description: "Unlimited projects. Pause or cancel anytime.",
    features: ["Unlimited Projects", "All Free features", "Priority AI processing", "Pause anytime"],
  },
  {
    id: "annual",
    label: "Annual",
    price: "$100/year",
    description: "Best value. Save $80 vs monthly.",
    badge: "Best Value",
    features: ["Unlimited Projects", "All Free features", "Priority AI processing", "Save $80/year"],
  },
];

export default function Signup() {
  const { toast } = useToast();
  const { refetchUser } = useAuth();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [school, setSchool] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
  const [couponCode, setCouponCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          plan: selectedPlan,
          handle: handle.trim() || undefined,
          school: school.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      await refetchUser();

      if (selectedPlan === "free") {
        navigate("/");
        return;
      }

      const pricesRes = await fetch(`${BASE}/api/stripe/prices`, { credentials: "include" });
      const pricesData = await pricesRes.json();

      const prices: any[] = pricesData.data || [];
      const targetInterval = selectedPlan === "monthly" ? "month" : "year";
      const price = prices.find((p: any) => p.recurring?.interval === targetInterval);

      if (!price) {
        navigate(`/subscription?plan=${selectedPlan}`);
        return;
      }

      const checkoutRes = await fetch(`${BASE}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId: price.price_id,
          planType: selectedPlan,
          couponCode: couponCode.trim() || undefined,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || "Failed to create checkout session");
      }
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        navigate("/subscription");
      }
    } catch (err: any) {
      toast({ title: err.message || "Signup failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = selectedPlan === "free"
    ? "Create Free Account"
    : `Create Account & Continue to Payment`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-800 to-indigo-900 p-8 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-white">Study Buddy</h1>
            <p className="text-blue-200 text-sm mt-1">Create your account</p>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Name + Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" required />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="h-11" required minLength={6} />
              </div>

              {/* Handle + School */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="handle">
                    Username <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="handle"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="yourusername"
                      className="h-11 pl-9"
                      maxLength={30}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Letters, numbers, underscores only</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">
                    School / Institution <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. State University"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Promo Code — only shown for paid plans */}
              {selectedPlan !== "free" && (
                <div className="space-y-2">
                  <Label htmlFor="coupon">Promo Code <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="coupon"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="h-11 pl-9 tracking-widest uppercase font-mono placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                    />
                  </div>
                </div>
              )}

              {/* Plan selector */}
              <div className="space-y-3">
                <Label>Choose your plan</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                        selectedPlan === plan.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2 right-3 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          {plan.badge}
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 text-sm">{plan.label}</span>
                        {selectedPlan === plan.id && (
                          <span className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div className={`text-base font-bold mb-1 ${plan.id === "free" ? "text-emerald-600" : "text-blue-700"}`}>
                        {plan.price}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2 leading-tight">{plan.description}</p>
                      <ul className="space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-[11px] text-slate-600 flex items-start gap-1">
                            <Check className="w-2.5 h-2.5 text-green-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {buttonLabel}
              </Button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-blue-600 hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
