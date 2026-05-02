import { Link } from "wouter";
import { useAdminListMarketplace, type AdminMarketplaceListing } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Store, ArrowLeft, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminMarketplace() {
  const { user } = useAuth();
  const { data: listings, isLoading } = useAdminListMarketplace();

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/" className="text-blue-200 hover:text-white text-sm flex items-center mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Study Buddy
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-serif font-bold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <Store className="w-5 h-5" />
                Marketplace Admin
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {listings ? `${listings.length} total listing${listings.length !== 1 ? "s" : ""}` : "Loading..."}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/users">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent" size="sm">
                  Users
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
          </div>
        ) : listings?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No marketplace listings yet.</div>
        ) : (
          <div className="space-y-3">
            {listings?.map((listing: AdminMarketplaceListing) => (
              <Card key={listing.id} className="shadow-sm border rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{listing.projectName ?? `Project #${listing.projectId}`}</span>
                        <Badge
                          variant={listing.isActive ? "default" : "secondary"}
                          className={`text-xs ${listing.isActive ? "bg-green-100 text-green-800 border-0" : ""}`}
                        >
                          {listing.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {formatPrice(listing.priceCents)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {listing.sellerHandle && <span>@{listing.sellerHandle}</span>}
                        {listing.sellerEmail && <span>{listing.sellerEmail}</span>}
                        <span>{listing.holderCount} holder{listing.holderCount !== 1 ? "s" : ""}</span>
                        <span>Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      #{listing.id}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
