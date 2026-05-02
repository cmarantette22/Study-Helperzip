import { Link, useParams, useLocation, useSearch } from "wouter";
import { useEffect } from "react";
import {
  useGetMarketplaceListing,
  useAcquireListing,
  useCreateMarketplaceCheckoutSession,
  getListMarketplaceListingsQueryKey,
  getGetMarketplaceListingQueryKey,
  getGetMyPurchasesQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowLeft, BookOpen, GraduationCap, Calendar, Tag, Users,
  CreditCard, CheckCircle2, ExternalLink, AlertCircle, PartyPopper,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MarketplaceListing() {
  const params = useParams<{ id: string }>();
  const listingId = parseInt(params.id!, 10);
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const checkoutStatus = searchParams.get("checkout");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useGetMarketplaceListing(listingId);

  const acquireMutation = useAcquireListing({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMarketplaceListingQueryKey(listingId) });
        queryClient.invalidateQueries({ queryKey: getGetMyPurchasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

        if (data.alreadyAcquired) {
          toast({ title: "You already have this project." });
          if (data.copiedProjectId) navigate(`/project/${data.copiedProjectId}`);
        } else {
          toast({ title: "Project added to your library!" });
          if (data.copiedProjectId) navigate(`/project/${data.copiedProjectId}`);
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || err?.message || "Failed to acquire listing";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const checkoutMutation = useCreateMarketplaceCheckoutSession({
    mutation: {
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || err?.message || "Failed to start checkout";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const copiedProjectIdForPolling = listing?.myPurchase?.copiedProjectId ?? null;

  // After returning from Stripe checkout, poll the listing until copiedProjectId
  // is populated by the webhook, then navigate directly to the new project.
  useEffect(() => {
    if (checkoutStatus !== "success") return;

    if (copiedProjectIdForPolling) {
      navigate(`/project/${copiedProjectIdForPolling}`);
      return;
    }

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetMarketplaceListingQueryKey(listingId) });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    }, 2000);

    return () => clearInterval(interval);
  }, [checkoutStatus, copiedProjectIdForPolling, listingId, navigate, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Listing not found.</p>
          <Link href="/marketplace">
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = listing.sellerUserId === user?.id;
  const alreadyAcquired = !!listing.myPurchase;
  const copiedProjectId = listing.myPurchase?.copiedProjectId;
  const paymentPending = alreadyAcquired && !copiedProjectId;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground py-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/marketplace" className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground mb-4 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Marketplace
          </Link>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight mb-1">
                {listing.project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {listing.sellerHandle && (
                  <span className="flex items-center text-primary-foreground/80 text-sm gap-1.5">
                    <Tag className="w-4 h-4" />
                    @{listing.sellerHandle}
                  </span>
                )}
                <span className="flex items-center text-primary-foreground/70 text-sm gap-1.5">
                  <Users className="w-4 h-4" />
                  {listing.holderCount} holder{listing.holderCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {formatPrice(listing.priceCents)}
                </div>
                {listing.priceCents > 0 && (
                  <div className="text-primary-foreground/60 text-xs mt-0.5">per copy</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-6 relative z-20 space-y-6">
        {/* Payment success banner */}
        {checkoutStatus === "success" && (
          <Card className="shadow-lg border-0 bg-green-50 border-green-200 rounded-xl overflow-hidden">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <PartyPopper className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Payment successful!</p>
                <p className="text-sm text-green-800 mt-0.5">
                  Your project copy is being prepared. It will appear in your library in a few moments — refresh this page to check.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acquire Card */}
        <Card className="shadow-lg border-0 bg-card rounded-xl overflow-hidden">
          <CardContent className="p-6">
            {isOwner ? (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">This is your listing</p>
                  <p className="text-sm text-muted-foreground">You can manage it from the project detail page.</p>
                </div>
                <Link href={`/project/${listing.projectId}`} className="ml-auto">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" /> View Project
                  </Button>
                </Link>
              </div>
            ) : paymentPending ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Payment processing</p>
                  <p className="text-sm text-muted-foreground">Your project copy will appear in your library shortly.</p>
                </div>
              </div>
            ) : alreadyAcquired ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">You have this project</p>
                  <p className="text-sm text-muted-foreground">Find it in your project library.</p>
                </div>
                {copiedProjectId && (
                  <Link href={`/project/${copiedProjectId}`} className="ml-auto">
                    <Button size="sm">
                      <BookOpen className="w-4 h-4 mr-1" /> Go to Project
                    </Button>
                  </Link>
                )}
              </div>
            ) : listing.priceCents > 0 ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                  <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Secure checkout via Stripe</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      You'll be taken to Stripe to complete your payment. You'll get a clean copy of this project instantly after checkout.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base"
                  onClick={() => checkoutMutation.mutate({ id: listingId })}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5 mr-2" />
                  )}
                  Get for {formatPrice(listing.priceCents)}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  You'll get a clean copy of this project in your library — no stats or activity carried over.
                </p>
                <Button
                  className="w-full h-12 text-base"
                  onClick={() => acquireMutation.mutate({ id: listingId })}
                  disabled={acquireMutation.isPending}
                >
                  {acquireMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <BookOpen className="w-5 h-5 mr-2" />
                  )}
                  Get This Project — Free
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card className="shadow-sm border-border bg-card rounded-xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-serif font-bold text-foreground">Project Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listing.project.course && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Course</p>
                  <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    {listing.project.course}
                  </p>
                </div>
              )}
              {listing.project.school && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">School</p>
                  <p className="font-medium text-foreground text-sm">{listing.project.school}</p>
                </div>
              )}
              {listing.project.term && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Term</p>
                  <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    {listing.project.term}
                  </p>
                </div>
              )}
              {listing.project.year && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Year</p>
                  <p className="font-medium text-foreground text-sm">{listing.project.year}</p>
                </div>
              )}
            </div>

            {listing.project.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {listing.project.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Info */}
        {(listing.sellerHandle || listing.sellerName) && (
          <Card className="shadow-sm border-border bg-card rounded-xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-serif font-bold text-foreground mb-3">About the Creator</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {listing.sellerName && <p className="font-medium text-foreground">{listing.sellerName}</p>}
                  {listing.sellerHandle && (
                    <p className="text-sm text-primary/80">@{listing.sellerHandle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
