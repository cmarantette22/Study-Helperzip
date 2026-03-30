import { useRef, ChangeEvent, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetProject,
  useListProjectQuestions,
  useParseQuestionImage,
  useParsePdfQuestions,
  useCreateQuestion,
  useResetProjectAnswers,
  useListOutlineSections,
  useUploadOutline,
  useDeleteOutlineSection,
  getListProjectQuestionsQueryKey,
  getGetProjectQueryKey,
  getGetQuestionStatsQueryKey,
  getListProjectsQueryKey,
  getListOutlineSectionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BookOpen, BrainCircuit, Loader2, ArrowRight, Target, ListChecks, Sparkles, Plus, X, FileText, CheckCircle2, ArrowLeft, RotateCcw, Filter, ScrollText, Trash2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

type FilterType = "all" | "correct" | "needs_review" | "unanswered";
type TabType = "outline" | "questions";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id!, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const outlinePdfInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>("outline");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [pdfProgress, setPdfProgress] = useState<{ status: "idle" | "reading" | "parsing" | "done" | "error"; totalParsed?: number; fileName?: string }>({ status: "idle" });
  const [outlineText, setOutlineText] = useState("");
  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [outlineUploadProgress, setOutlineUploadProgress] = useState<"idle" | "reading" | "parsing">("idle");
  const [deleteDialogSectionId, setDeleteDialogSectionId] = useState<number | null>(null);

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId);
  const { data: questions, isLoading: isLoadingQuestions } = useListProjectQuestions(projectId, { filter: activeFilter }, {
    query: { enabled: !!projectId }
  });
  const { data: outlineSections, isLoading: isLoadingOutline } = useListOutlineSections(projectId, {
    query: { enabled: !!projectId }
  });

  const [snapshotProgress, setSnapshotProgress] = useState<{ total: number; completed: number; failed: number; status: "idle" | "uploading" | "done" }>({ total: 0, completed: 0, failed: 0, status: "idle" });

  const parseImageMutation = useParseQuestionImage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectQuestionsQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
      onError: () => {},
    },
  });

  const parsePdfMutation = useParsePdfQuestions({
    mutation: {
      onSuccess: (data) => {
        setPdfProgress({ status: "done", totalParsed: data.totalParsed, fileName: pdfProgress.fileName });
        queryClient.invalidateQueries({ queryKey: getListProjectQuestionsQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: `${data.totalParsed} questions imported!` });
      },
      onError: () => {
        setPdfProgress({ status: "error" });
        toast({ title: "Failed to parse PDF", variant: "destructive" });
      },
    },
  });

  const createQuestionMutation = useCreateQuestion({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Question created" });
        queryClient.invalidateQueries({ queryKey: getListProjectQuestionsQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsManualDialogOpen(false);
        setManualQuestionText("");
        setManualChoices([
          { label: "A", text: "", isCorrect: true },
          { label: "B", text: "", isCorrect: false },
          { label: "C", text: "", isCorrect: false },
          { label: "D", text: "", isCorrect: false },
        ]);
        setLocation(`/question/${data.id}`);
      },
    },
  });

  const resetMutation = useResetProjectAnswers({
    mutation: {
      onSuccess: (data) => {
        toast({ title: `${data.resetCount} answers cleared` });
        queryClient.invalidateQueries({ queryKey: getListProjectQuestionsQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
    },
  });

  const uploadOutlineMutation = useUploadOutline({
    mutation: {
      onSuccess: (data) => {
        setOutlineUploadProgress("idle");
        setIsOutlineDialogOpen(false);
        setOutlineText("");
        queryClient.invalidateQueries({ queryKey: getListOutlineSectionsQueryKey(projectId) });
        toast({ title: `${data.length} sections parsed from outline!` });
      },
      onError: (err: any) => {
        setOutlineUploadProgress("idle");
        const msg = err?.response?.data?.error || err?.message || "Failed to parse outline";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const deleteSectionMutation = useDeleteOutlineSection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOutlineSectionsQueryKey(projectId) });
        toast({ title: "Section deleted" });
        setDeleteDialogSectionId(null);
      },
    },
  });

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualQuestionText, setManualQuestionText] = useState("");
  const [manualChoices, setManualChoices] = useState([
    { label: "A", text: "", isCorrect: true },
    { label: "B", text: "", isCorrect: false },
    { label: "C", text: "", isCorrect: false },
    { label: "D", text: "", isCorrect: false },
  ]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 30);
    setSnapshotProgress({ total: fileArray.length, completed: 0, failed: 0, status: "uploading" });

    let completed = 0;
    let failed = 0;

    for (const file of fileArray) {
      try {
        const base64 = await fileToBase64(file);
        await new Promise<void>((resolve, reject) => {
          parseImageMutation.mutate(
            { data: { imageBase64: base64, projectId } },
            {
              onSuccess: () => { completed++; setSnapshotProgress(prev => ({ ...prev, completed })); resolve(); },
              onError: () => { failed++; setSnapshotProgress(prev => ({ ...prev, failed })); resolve(); },
            }
          );
        });
      } catch {
        failed++;
        setSnapshotProgress(prev => ({ ...prev, failed }));
      }
    }

    setSnapshotProgress({ total: fileArray.length, completed, failed, status: "done" });
    toast({ title: `${completed} of ${fileArray.length} questions parsed` });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfProgress({ status: "reading", fileName: file.name });
    try {
      const base64 = await fileToBase64(file);
      setPdfProgress({ status: "parsing", fileName: file.name });
      parsePdfMutation.mutate({ data: { pdfBase64: base64, projectId } });
    } catch {
      setPdfProgress({ status: "error" });
      toast({ title: "Error reading PDF file", variant: "destructive" });
    } finally {
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleOutlinePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOutlineUploadProgress("reading");
    try {
      const base64 = await fileToBase64(file);
      setOutlineUploadProgress("parsing");
      uploadOutlineMutation.mutate({ id: projectId, data: { pdfBase64: base64 } });
    } catch {
      setOutlineUploadProgress("idle");
      toast({ title: "Error reading PDF file", variant: "destructive" });
    } finally {
      if (outlinePdfInputRef.current) outlinePdfInputRef.current.value = "";
    }
  };

  const handleOutlineTextSubmit = () => {
    if (!outlineText.trim()) return;
    setOutlineUploadProgress("parsing");
    uploadOutlineMutation.mutate({ id: projectId, data: { text: outlineText } });
  };

  const handleManualSubmit = () => {
    if (!manualQuestionText.trim() || manualChoices.some((c) => !c.text.trim()) || !manualChoices.some((c) => c.isCorrect)) {
      toast({ title: "Please fill out all fields and select a correct answer.", variant: "destructive" });
      return;
    }
    createQuestionMutation.mutate({
      data: { questionText: manualQuestionText, projectId, choices: manualChoices },
    });
  };

  const handleReset = () => {
    const filterForReset = activeFilter === "unanswered" ? "all" : activeFilter;
    resetMutation.mutate({ id: projectId, params: { filter: filterForReset as any } });
  };

  const filterLabel = activeFilter === "all" ? "All" : activeFilter === "correct" ? "Correct" : activeFilter === "needs_review" ? "Needs Review" : "Unanswered";
  const hasAnsweredInView = questions?.some((q) => q.answered) ?? false;
  const showResetButton = activeFilter !== "unanswered" && hasAnsweredInView;

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground py-8 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground mb-4 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> All Projects
          </Link>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight mb-1">{project?.name}</h1>
              <p className="text-primary-foreground/70 text-sm">
                {project?.totalQuestions} questions · {project?.accuracyPercent}% accuracy
                {outlineSections && outlineSections.length > 0 && ` · ${outlineSections.length} outline sections`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-6 relative z-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-sm uppercase tracking-wider">
                <ListChecks className="w-4 h-4 mr-2 text-primary" /> Total Questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{project?.totalQuestions || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-xs uppercase tracking-wider">
                <Target className="w-4 h-4 mr-2 text-primary" /> Accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{project?.accuracyPercent || 0}%</div>
              <Progress value={project?.accuracyPercent || 0} className="h-1.5 mt-3 bg-muted" />
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-xs uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 mr-2 text-amber-500" /> Needs Review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-amber-600">{project?.incorrectAnswers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1.5 mb-8">
          <button
            onClick={() => setActiveTab("outline")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "outline"
                ? "bg-card text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ScrollText className="w-4 h-4" />
            Outline
            {outlineSections && outlineSections.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{outlineSections.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "questions"
                ? "bg-card text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Questions
            {project && project.totalQuestions > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{project.totalQuestions}</span>
            )}
          </button>
        </div>

        {/* OUTLINE TAB */}
        {activeTab === "outline" && (
          <div>
            {/* Upload actions */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold text-foreground flex items-center">
                <ScrollText className="w-5 h-5 mr-2 text-primary" />
                Course Outline
              </h2>
              <div className="flex gap-2">
                <Dialog open={isOutlineDialogOpen} onOpenChange={setIsOutlineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="shadow-lg rounded-lg h-9 px-4">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Outline
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-card border-none shadow-2xl rounded-2xl">
                    <div className="p-6 md:p-8">
                      <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-serif text-foreground">Upload Course Outline</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Paste your course outline text or upload a PDF. AI will break it into study sections.
                        </DialogDescription>
                      </DialogHeader>

                      {outlineUploadProgress !== "idle" ? (
                        <div className="flex flex-col items-center py-8 gap-4">
                          <Loader2 className="w-10 h-10 animate-spin text-primary" />
                          <p className="text-lg font-semibold text-foreground">
                            {outlineUploadProgress === "reading" ? "Reading document..." : "AI is parsing sections..."}
                          </p>
                          <p className="text-sm text-muted-foreground">This may take a moment</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Paste Outline Text</Label>
                            <Textarea
                              value={outlineText}
                              onChange={(e) => setOutlineText(e.target.value)}
                              placeholder={"Chapter 1: Supply and Demand\n- Price elasticity\n- Market equilibrium\n\nChapter 2: Consumer Theory\n- Utility maximization\n- Budget constraints"}
                              className="resize-none h-48 bg-muted/50 border-border focus-visible:ring-primary text-sm font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground font-medium uppercase">or</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          <input type="file" accept=".pdf,application/pdf" className="hidden" ref={outlinePdfInputRef} onChange={handleOutlinePdfUpload} />
                          <Button
                            variant="outline"
                            className="w-full h-12 border-dashed border-2"
                            onClick={() => outlinePdfInputRef.current?.click()}
                          >
                            <FileText className="w-5 h-5 mr-2" />
                            Upload PDF of Outline / Syllabus
                          </Button>
                        </div>
                      )}
                    </div>
                    {outlineUploadProgress === "idle" && (
                      <div className="p-6 bg-muted/40 border-t border-border flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsOutlineDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleOutlineTextSubmit} disabled={!outlineText.trim()} className="px-6">
                          Parse Outline
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Outline Sections List */}
            {isLoadingOutline ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
              </div>
            ) : !outlineSections || outlineSections.length === 0 ? (
              <div className="bg-card border-2 border-dashed border-primary/20 rounded-2xl p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ScrollText className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-bold mb-3 text-foreground">No outline uploaded</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm leading-relaxed">
                  Upload your course outline or syllabus to break it into sections for deep-dive study.
                </p>
                <Button onClick={() => setIsOutlineDialogOpen(true)} size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Outline
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {outlineSections.map((section, index) => (
                  <Link key={section.id} href={`/project/${projectId}/outline/${section.id}`}>
                    <Card className="hover:border-primary/40 transition-all hover:shadow-md cursor-pointer group shadow-sm border-border bg-card rounded-xl">
                      <CardContent className="p-6 flex items-start gap-5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-primary transition-colors">
                            {section.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                            {section.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteDialogSectionId(section.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <div className="p-3 rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === "questions" && (
          <div>
            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-serif font-bold text-foreground flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                Questions
                {questions && <span className="text-sm font-normal text-muted-foreground ml-2">({questions.length})</span>}
              </h2>
              <div className="flex flex-wrap gap-3">
                <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <input type="file" accept=".pdf,application/pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} />
                <Button
                  size="sm"
                  className="shadow-lg rounded-lg h-9 px-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={snapshotProgress.status === "uploading"}
                >
                  {snapshotProgress.status === "uploading" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Snapshot
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg rounded-lg h-9 px-4"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={parsePdfMutation.isPending}
                >
                  {parsePdfMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  PDF
                </Button>
                <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-lg h-9">
                      <Plus className="w-4 h-4 mr-1" /> Manual
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-card border-none shadow-2xl rounded-2xl">
                    <div className="p-6 md:p-8">
                      <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-serif text-foreground">Add Question Manually</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="question" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Question Text</Label>
                          <Textarea
                            id="question"
                            value={manualQuestionText}
                            onChange={(e) => setManualQuestionText(e.target.value)}
                            placeholder="What is the capital of France?"
                            className="resize-none h-24 bg-muted/50 border-border focus-visible:ring-primary text-base"
                          />
                        </div>
                        <div className="space-y-4">
                          <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Choices (Check correct answer)</Label>
                          {manualChoices.map((choice, i) => (
                            <div key={choice.label} className="flex items-center gap-3">
                              <Checkbox
                                id={`correct-${i}`}
                                checked={choice.isCorrect}
                                onCheckedChange={(checked) => {
                                  setManualChoices(manualChoices.map((c, j) => ({ ...c, isCorrect: i === j ? !!checked : false })));
                                }}
                                className="w-6 h-6 rounded-full border-border data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                              />
                              <div className="font-bold text-muted-foreground w-6 text-center">{choice.label}</div>
                              <Input
                                value={choice.text}
                                onChange={(e) => {
                                  const nc = [...manualChoices];
                                  nc[i].text = e.target.value;
                                  setManualChoices(nc);
                                }}
                                placeholder={`Choice ${choice.label}`}
                                className="bg-muted/50 border-border focus-visible:ring-primary"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-muted/40 border-t border-border flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setIsManualDialogOpen(false)} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                      <Button onClick={handleManualSubmit} disabled={createQuestionMutation.isPending} className="px-6">
                        {createQuestionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Question
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Snapshot Import Progress */}
            {snapshotProgress.status !== "idle" && (
              <Card className="shadow-lg border-0 bg-card rounded-xl mb-6 overflow-hidden">
                <div className={`h-1 ${snapshotProgress.status === "done" ? "bg-green-500" : "bg-primary animate-pulse"}`} />
                <CardContent className="p-5 flex items-center gap-4">
                  {snapshotProgress.status === "done" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm">Upload Complete!</p>
                        <p className="text-muted-foreground text-xs">{snapshotProgress.completed} parsed{snapshotProgress.failed > 0 ? `, ${snapshotProgress.failed} failed` : ""}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSnapshotProgress({ total: 0, completed: 0, failed: 0, status: "idle" })}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm">
                          Parsing images... ({snapshotProgress.completed + snapshotProgress.failed}/{snapshotProgress.total})
                        </p>
                        <Progress value={((snapshotProgress.completed + snapshotProgress.failed) / snapshotProgress.total) * 100} className="h-1.5 mt-2 bg-muted" />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PDF Import Progress */}
            {pdfProgress.status !== "idle" && pdfProgress.status !== "error" && (
              <Card className="shadow-lg border-0 bg-card rounded-xl mb-8 overflow-hidden">
                <div className={`h-1 ${pdfProgress.status === "done" ? "bg-green-500" : "bg-primary animate-pulse"}`} />
                <CardContent className="p-6 flex items-center gap-4">
                  {pdfProgress.status === "done" ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-lg">Import Complete!</p>
                        <p className="text-muted-foreground">{pdfProgress.totalParsed} questions imported from {pdfProgress.fileName}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setPdfProgress({ status: "idle" })}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-lg">
                          {pdfProgress.status === "reading" ? "Reading PDF..." : "AI is parsing questions..."}
                        </p>
                        <p className="text-muted-foreground">
                          {pdfProgress.status === "reading" ? "Extracting text from document" : "This may take a minute for large documents"}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Filter Bar & Reset */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="flex bg-muted rounded-lg p-1 gap-1">
                  {(["all", "unanswered", "correct", "needs_review"] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeFilter === f
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "All" : f === "correct" ? "Correct" : f === "needs_review" ? "Needs Review" : "Unanswered"}
                    </button>
                  ))}
                </div>
              </div>
              {showResetButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={resetMutation.isPending}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                >
                  {resetMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Reset {filterLabel}
                </Button>
              )}
            </div>

            {/* Questions List */}
            {isLoadingQuestions ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
              </div>
            ) : questions?.length === 0 ? (
              <div className="bg-card border-2 border-dashed border-primary/20 rounded-2xl p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-bold mb-3 text-foreground">
                  {activeFilter === "all" ? "No questions yet" : `No ${filterLabel.toLowerCase()} questions`}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm leading-relaxed">
                  {activeFilter === "all"
                    ? "Upload a photo or PDF of multiple-choice questions to get started."
                    : "Try a different filter or keep studying!"}
                </p>
                {activeFilter === "all" && (
                  <Button onClick={() => fileInputRef.current?.click()} size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload your first question
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {questions?.map((q) => (
                  <Link key={q.id} href={`/question/${q.id}`}>
                    <Card className="hover:border-primary/40 transition-all hover:shadow-md cursor-pointer group shadow-sm border-border bg-card rounded-xl">
                      <CardContent className="p-6 flex items-start gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            {q.answered ? (
                              <Badge
                                variant={q.answeredCorrectly ? "default" : "destructive"}
                                className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                  q.answeredCorrectly
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : "bg-red-100 text-red-800 hover:bg-red-100"
                                }`}
                              >
                                {q.answeredCorrectly ? "Correct" : "Needs Review"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">
                                To do
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="font-medium text-foreground line-clamp-2 leading-relaxed text-sm">{q.questionText}</p>
                        </div>
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
        )}
      </main>

      {/* Delete Section Confirmation Dialog */}
      <Dialog open={deleteDialogSectionId !== null} onOpenChange={(open) => !open && setDeleteDialogSectionId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-serif text-center">Delete Section</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Are you sure you want to delete this outline section? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setDeleteDialogSectionId(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialogSectionId !== null) {
                  deleteSectionMutation.mutate({ id: projectId, sectionId: deleteDialogSectionId });
                }
              }}
              disabled={deleteSectionMutation.isPending}
              className="flex-1"
            >
              {deleteSectionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
