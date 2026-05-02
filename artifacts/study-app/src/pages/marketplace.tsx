import { Link } from "wouter";
import { useListMarketplaceListings, type MarketplaceListing } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, ArrowLeft, BookOpen, GraduationCap, Calendar, Tag, ArrowRight } from "lucide-react";

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Marketplace() {
  const { user } = useAuth();
  const { data: listings, isLoading } = useListMarketplaceListings();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground py-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground mb-4 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Study Buddy
          </Link>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight mb-2 flex items-center gap-3">
                <Store className="w-8 h-8" />
                Marketplace
              </h1>
              <p className="text-primary-foreground/80 text-sm md:text-base max-w-md">
                Browse study projects shared by the community. Get a clean copy to study with.
              </p>
            </div>
            {listings && (
              <Badge className="bg-white/20 text-primary-foreground border-0 text-sm px-3 py-1.5">
                {listings.length} listing{listings.length !== 1 ? "s" : ""} available
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-6 relative z-20">
        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
          </div>
        ) : !listings || listings.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-primary/20 rounded-2xl p-16 text-center shadow-sm mt-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-3 text-foreground">No listings yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              Be the first to list a study project! Go to any of your projects and use the Marketplace option.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 mt-6">
            {listings.map((listing: MarketplaceListing) => (
              <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                <Card className="hover:border-primary/40 transition-all hover:shadow-md cursor-pointer group shadow-sm border-border bg-card rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors truncate">
                            {listing.project.name}
                          </h3>
                          <Badge
                            variant={listing.priceCents === 0 ? "secondary" : "default"}
                            className={`flex-shrink-0 font-semibold ${listing.priceCents === 0 ? "bg-green-100 text-green-800" : "bg-primary text-primary-foreground"}`}
                          >
                            {formatPrice(listing.priceCents)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          {listing.project.course && (
                            <span className="flex items-center text-xs text-muted-foreground gap-1">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {listing.project.course}
                            </span>
                          )}
                          {listing.project.school && (
                            <span className="text-xs text-muted-foreground">{listing.project.school}</span>
                          )}
                          {listing.project.term && listing.project.year && (
                            <span className="flex items-center text-xs text-muted-foreground gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {listing.project.term} {listing.project.year}
                            </span>
                          )}
                          {listing.sellerHandle && (
                            <span className="flex items-center text-xs text-primary/70 gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              @{listing.sellerHandle}
                            </span>
                          )}
                        </div>

                        {listing.project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {listing.project.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-3">
                          {listing.myPurchase && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Already acquired
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {listing.holderCount} holder{listing.holderCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="self-center p-3 rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 flex-shrink-0">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
