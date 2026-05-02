import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListMarketplaceListings, type MarketplaceListing } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Store, ArrowLeft, BookOpen, GraduationCap, Calendar, Tag, ArrowRight, Search, X } from "lucide-react";

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

const ALL = "__all__";

export default function Marketplace() {
  const { user } = useAuth();
  const { data: listings, isLoading } = useListMarketplaceListings();

  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState(ALL);
  const [filterTerm, setFilterTerm] = useState(ALL);
  const [filterYear, setFilterYear] = useState(ALL);
  const [filterHandle, setFilterHandle] = useState("");

  const schools = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.project.school).filter(Boolean) as string[])].sort();
  }, [listings]);

  const terms = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.project.term).filter(Boolean) as string[])].sort();
  }, [listings]);

  const years = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.project.year).filter((y): y is number => y != null))].sort((a, b) => b - a);
  }, [listings]);

  const filtered = useMemo(() => {
    if (!listings) return [];
    const q = search.toLowerCase().trim();
    const h = filterHandle.toLowerCase().trim();
    return listings.filter((l) => {
      if (filterSchool !== ALL && l.project.school !== filterSchool) return false;
      if (filterTerm !== ALL && l.project.term !== filterTerm) return false;
      if (filterYear !== ALL && String(l.project.year) !== filterYear) return false;
      if (h && !(l.sellerHandle?.toLowerCase().includes(h))) return false;
      if (q) {
        const haystack = [
          l.project.name,
          l.project.description,
          l.project.course,
          l.project.school,
          l.project.term,
          String(l.project.year ?? ""),
          l.sellerHandle,
          l.sellerName,
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [listings, search, filterSchool, filterTerm, filterYear, filterHandle]);

  const hasActiveFilters = search || filterSchool !== ALL || filterTerm !== ALL || filterYear !== ALL || filterHandle;

  function clearFilters() {
    setSearch("");
    setFilterSchool(ALL);
    setFilterTerm(ALL);
    setFilterYear(ALL);
    setFilterHandle("");
  }

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

      <main className="max-w-4xl mx-auto px-6 pt-8 relative z-20">
        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
          </div>
        ) : !listings || listings.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-primary/20 rounded-2xl p-16 text-center shadow-sm mt-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-3 text-foreground">No listings yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              Be the first to list a study project! Go to any of your projects and use the Marketplace option.
            </p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <Card className="shadow-sm border-border rounded-xl mb-6">
              <CardContent className="p-4 space-y-3">
                {/* Omni search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, course, description…"
                    className="pl-9 h-10"
                  />
                  {search && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearch("")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Row of selects + handle */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Select value={filterSchool} onValueChange={setFilterSchool}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="School / Program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Schools</SelectItem>
                      {schools.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterTerm} onValueChange={setFilterTerm}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Terms</SelectItem>
                      {terms.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={filterHandle}
                      onChange={(e) => setFilterHandle(e.target.value)}
                      placeholder="Creator handle"
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      {filtered.length} of {listings.length} listing{listings.length !== 1 ? "s" : ""}
                    </p>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                      <X className="w-3 h-3 mr-1" /> Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listings */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No listings match your filters</p>
                <Button variant="link" className="mt-2 text-sm" onClick={clearFilters}>Clear filters</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((listing: MarketplaceListing) => (
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
          </>
        )}
      </main>
    </div>
  );
}
