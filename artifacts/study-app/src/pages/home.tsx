import { useState } from "react";
import { Link } from "wouter";
import {
  useListProjects,
  useCreateProject,
  useDeleteProject,
  useGetQuestionStats,
  useGetMyListings,
  getListProjectsQueryKey,
  getGetQuestionStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BrainCircuit, Loader2, ArrowRight, Target, ListChecks, Sparkles, Plus, FolderOpen, Trash2, LogOut, Shield, CreditCard, User, Store, Tag, TrendingUp, Users, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

const SELLER_RATE = 0.85;

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const { data: stats, isLoading: isLoadingStats } = useGetQuestionStats();
  const { data: projects, isLoading: isLoadingProjects } = useListProjects();
  const { data: myListings, isLoading: isLoadingMyListings } = useGetMyListings();

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCourse, setNewProjectCourse] = useState("");
  const [newProjectSchool, setNewProjectSchool] = useState("");
  const [newProjectTerm, setNewProjectTerm] = useState("");
  const [newProjectYear, setNewProjectYear] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [showProjectMetadata, setShowProjectMetadata] = useState(false);

  const resetNewProjectForm = () => {
    setNewProjectName("");
    setNewProjectCourse("");
    setNewProjectSchool("");
    setNewProjectTerm("");
    setNewProjectYear("");
    setNewProjectDescription("");
    setShowProjectMetadata(false);
  };

  const createProjectMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project created" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
        setIsNewProjectOpen(false);
        resetNewProjectForm();
      },
    },
  });

  const deleteProjectMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project deleted" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
      },
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({ title: "Please enter a project name", variant: "destructive" });
      return;
    }
    const data: {
      name: string;
      course?: string;
      school?: string;
      term?: string;
      year?: number;
      description?: string;
    } = { name: newProjectName.trim() };
    if (newProjectCourse.trim()) data.course = newProjectCourse.trim();
    if (newProjectSchool.trim()) data.school = newProjectSchool.trim();
    if (newProjectTerm.trim()) data.term = newProjectTerm.trim();
    if (newProjectYear.trim()) data.year = parseInt(newProjectYear.trim(), 10);
    if (newProjectDescription.trim()) data.description = newProjectDescription.trim();
    createProjectMutation.mutate({ data });
  };

  const handleDeleteProject = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this project and all its questions?")) {
      deleteProjectMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground py-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-end gap-2 mb-4">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                <Store className="w-4 h-4 mr-1" /> Marketplace
              </Button>
            </Link>
            {user?.role === "admin" && (
              <>
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                    <Shield className="w-4 h-4 mr-1" /> Users
                  </Button>
                </Link>
                <Link href="/admin/marketplace">
                  <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                    <Shield className="w-4 h-4 mr-1" /> Mkt Admin
                  </Button>
                </Link>
              </>
            )}
            <Link href="/subscription">
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                <CreditCard className="w-4 h-4 mr-1" /> Subscription
              </Button>
            </Link>
            <Link href="/manage-account">
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                <User className="w-4 h-4 mr-1" /> Account
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight mb-2">Study Buddy</h1>
            <p className="text-primary-foreground/90 text-sm md:text-base font-medium max-w-md">
              Create study projects to organize your multiple-choice questions.
            </p>
          </div>
          <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl w-full md:w-auto text-lg h-14 px-8 rounded-xl transition-transform active:scale-95"
              >
                <Plus className="w-6 h-6 mr-3" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-none shadow-2xl rounded-2xl">
              <div className="p-6 md:p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-serif text-foreground">New Study Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">
                      Project Name
                    </Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g. Econ 202 Midterm 2"
                      className="bg-muted/50 border-border focus-visible:ring-primary text-base h-12"
                      onKeyDown={(e) => e.key === "Enter" && !showProjectMetadata && handleCreateProject()}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProjectMetadata((v) => !v)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {showProjectMetadata ? "− Hide" : "+ Add"} course details (optional)
                  </button>
                  {showProjectMetadata && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="np-course" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Course</Label>
                          <Input id="np-course" value={newProjectCourse} onChange={(e) => setNewProjectCourse(e.target.value)} placeholder="e.g. CS 101" className="bg-muted/50 border-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="np-school" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">School</Label>
                          <Input id="np-school" value={newProjectSchool} onChange={(e) => setNewProjectSchool(e.target.value)} placeholder="e.g. MIT" className="bg-muted/50 border-border" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="np-term" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Term</Label>
                          <Input id="np-term" value={newProjectTerm} onChange={(e) => setNewProjectTerm(e.target.value)} placeholder="e.g. Fall" className="bg-muted/50 border-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="np-year" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Year</Label>
                          <Input id="np-year" type="number" value={newProjectYear} onChange={(e) => setNewProjectYear(e.target.value)} placeholder="e.g. 2025" className="bg-muted/50 border-border" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="np-desc" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Description</Label>
                        <Input id="np-desc" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="What topics does this cover?" className="bg-muted/50 border-border" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-muted/40 border-t border-border flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setIsNewProjectOpen(false); resetNewProjectForm(); }} className="text-muted-foreground hover:text-foreground">
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending} className="px-6">
                  {createProjectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-sm uppercase tracking-wider">
                <ListChecks className="w-4 h-4 mr-2 text-primary" /> Total Questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">
                {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : stats?.totalQuestions || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-xs uppercase tracking-wider">
                <Target className="w-4 h-4 mr-2 text-primary" /> Accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold flex items-baseline gap-2 text-foreground">
                {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : `${stats?.accuracyPercent || 0}%`}
              </div>
              <Progress value={stats?.accuracyPercent || 0} className="h-1.5 mt-3 bg-muted" />
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-xs uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 mr-2 text-amber-500" /> Needs Review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-amber-600">
                {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : stats?.incorrectAnswers || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seller Dashboard */}
        {(isLoadingMyListings || (myListings && myListings.length > 0)) && (
          <div className="mb-14">
            <h2 className="text-xl font-serif font-bold text-foreground mb-5 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              My Listings
            </h2>
            {isLoadingMyListings ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
              </div>
            ) : (
              <div className="grid gap-4">
                {myListings?.map((listing) => {
                  const revenue = listing.priceCents * listing.holderCount * SELLER_RATE;
                  return (
                    <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                      <Card className="hover:border-primary/40 transition-all hover:shadow-md cursor-pointer shadow-sm border-border bg-card rounded-xl">
                        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground text-base truncate">
                                {listing.project.name}
                              </span>
                              <Badge
                                variant={listing.isActive ? "default" : "secondary"}
                                className={`text-xs ${listing.isActive ? "bg-green-100 text-green-800 border-0" : "bg-muted text-muted-foreground"}`}
                              >
                                {listing.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline" className="text-xs font-semibold">
                                {listing.priceCents === 0 ? "Free" : formatCents(listing.priceCents)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <div>
                                <p className="text-sm font-semibold text-foreground leading-none">{listing.holderCount}</p>
                                <p className="text-xs mt-0.5">holder{listing.holderCount !== 1 ? "s" : ""}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <DollarSign className="w-4 h-4" />
                              <div>
                                <p className="text-sm font-semibold text-foreground leading-none">{formatCents(revenue)}</p>
                                <p className="text-xs mt-0.5">earned (85%)</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Projects List */}
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground mb-5 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-primary" />
            Study Projects
          </h2>

          {isLoadingProjects ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
            </div>
          ) : projects?.length === 0 ? (
            <div className="bg-card border-2 border-dashed border-primary/20 rounded-2xl p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-3 text-foreground">No projects yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm leading-relaxed">
                Create a project to organize your study questions by subject or exam.
              </p>
              <Button onClick={() => setIsNewProjectOpen(true)} size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                <Plus className="w-5 h-5 mr-2" />
                Create your first project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects?.map((p) => (
                <Link key={p.id} href={`/project/${p.id}`}>
                  <Card className="hover:border-primary/40 transition-all hover:shadow-md cursor-pointer group shadow-sm border-border bg-card rounded-xl">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-base truncate">{p.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                          </p>
                          {p.isMarketplaceCopy && p.sourceOwnerHandle && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 font-normal border-primary/30 text-primary/70 flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" />
                              {p.sourceListingId ? (
                                <Link href={`/marketplace/${p.sourceListingId}`} onClick={(e) => e.stopPropagation()}>
                                  @{p.sourceOwnerHandle}
                                </Link>
                              ) : (
                                <span>@{p.sourceOwnerHandle}</span>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => handleDeleteProject(e, p.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="self-center p-3 rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
