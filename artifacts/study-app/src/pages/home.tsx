import { useRef, ChangeEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useListQuestions, 
  useGetQuestionStats, 
  useParseQuestionImage,
  useParsePdfQuestions,
  useCreateQuestion,
  getListQuestionsQueryKey,
  getGetQuestionStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BookOpen, BrainCircuit, Loader2, ArrowRight, Target, ListChecks, Sparkles, Plus, X, FileText, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfProgress, setPdfProgress] = useState<{ status: "idle" | "reading" | "parsing" | "done" | "error"; totalParsed?: number; fileName?: string }>({ status: "idle" });

  const { data: stats, isLoading: isLoadingStats } = useGetQuestionStats();
  const { data: questions, isLoading: isLoadingQuestions } = useListQuestions();

  const parseImageMutation = useParseQuestionImage({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Question parsed successfully",
          description: "Ready to test your knowledge!",
        });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
        setLocation(`/question/${data.id}`);
      },
      onError: () => {
        toast({
          title: "Failed to parse image",
          description: "Please ensure the image contains a clear multiple choice question.",
          variant: "destructive"
        });
      }
    }
  });

  const parsePdfMutation = useParsePdfQuestions({
    mutation: {
      onSuccess: (data) => {
        setPdfProgress({ status: "done", totalParsed: data.totalParsed, fileName: pdfProgress.fileName });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
        toast({
          title: `${data.totalParsed} questions imported!`,
          description: "All questions from the PDF have been added to your study deck.",
        });
      },
      onError: () => {
        setPdfProgress({ status: "error" });
        toast({
          title: "Failed to parse PDF",
          description: "Please ensure the PDF contains multiple-choice questions with an answer key.",
          variant: "destructive",
        });
      },
    },
  });

  const createQuestionMutation = useCreateQuestion({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Question created manually"
        });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
        setIsManualDialogOpen(false);
        setManualQuestionText("");
        setManualChoices([
          { label: "A", text: "", isCorrect: true },
          { label: "B", text: "", isCorrect: false },
          { label: "C", text: "", isCorrect: false },
          { label: "D", text: "", isCorrect: false },
        ]);
        setLocation(`/question/${data.id}`);
      }
    }
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
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      parseImageMutation.mutate({ data: { imageBase64: base64 } });
    } catch (err) {
      toast({
        title: "Error reading file",
        variant: "destructive"
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const uploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfProgress({ status: "reading", fileName: file.name });
    try {
      const base64 = await fileToBase64(file);
      setPdfProgress({ status: "parsing", fileName: file.name });
      parsePdfMutation.mutate({ data: { pdfBase64: base64 } });
    } catch {
      setPdfProgress({ status: "error" });
      toast({ title: "Error reading PDF file", variant: "destructive" });
    } finally {
      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  };

  const pdfUploadClick = () => {
    pdfInputRef.current?.click();
  };

  const handleManualSubmit = () => {
    if (!manualQuestionText.trim() || manualChoices.some(c => !c.text.trim()) || !manualChoices.some(c => c.isCorrect)) {
      toast({ title: "Please fill out all fields and select a correct answer.", variant: "destructive" });
      return;
    }
    createQuestionMutation.mutate({
      data: {
        questionText: manualQuestionText,
        choices: manualChoices
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-3">Study Buddy</h1>
            <p className="text-primary-foreground/90 text-lg md:text-xl font-medium max-w-md">
              Upload any multiple-choice question to build your personal study deck.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <input 
              type="file" 
              accept=".pdf,application/pdf" 
              className="hidden" 
              ref={pdfInputRef} 
              onChange={handlePdfUpload} 
            />
            <Button 
              size="lg" 
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl w-full md:w-auto text-lg h-14 px-8 rounded-xl transition-transform active:scale-95"
              onClick={uploadClick}
              disabled={parseImageMutation.isPending}
            >
              {parseImageMutation.isPending ? (
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              ) : (
                <Upload className="w-6 h-6 mr-3" />
              )}
              {parseImageMutation.isPending ? "Extracting..." : "Upload Snapshot"}
            </Button>

            <Button 
              size="lg" 
              className="bg-secondary/80 text-secondary-foreground hover:bg-secondary/70 shadow-xl w-full md:w-auto text-lg h-14 px-8 rounded-xl transition-transform active:scale-95"
              onClick={pdfUploadClick}
              disabled={parsePdfMutation.isPending}
            >
              {parsePdfMutation.isPending ? (
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              ) : (
                <FileText className="w-6 h-6 mr-3" />
              )}
              {parsePdfMutation.isPending ? "Parsing PDF..." : "Upload PDF"}
            </Button>

            <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto h-14 rounded-xl">
                  <Plus className="w-5 h-5 mr-2" />
                  Manual Add
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
                              const newChoices = manualChoices.map((c, j) => ({
                                ...c,
                                isCorrect: i === j ? !!checked : false
                              }));
                              setManualChoices(newChoices);
                            }}
                            className="w-6 h-6 rounded-full border-border data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <div className="font-bold text-muted-foreground w-6 text-center">{choice.label}</div>
                          <Input 
                            value={choice.text}
                            onChange={(e) => {
                              const newChoices = [...manualChoices];
                              newChoices[i].text = e.target.value;
                              setManualChoices(newChoices);
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
                  <Button variant="ghost" onClick={() => setIsManualDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleManualSubmit}
                    disabled={createQuestionMutation.isPending}
                    className="px-6"
                  >
                    {createQuestionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Question
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-sm uppercase tracking-wider">
                <ListChecks className="w-4 h-4 mr-2 text-primary" /> Total Questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-foreground">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : stats?.totalQuestions || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-sm uppercase tracking-wider">
                <Target className="w-4 h-4 mr-2 text-primary" /> Accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold flex items-baseline gap-2 text-foreground">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : `${stats?.accuracyPercent || 0}%`}
              </div>
              <Progress value={stats?.accuracyPercent || 0} className="h-1.5 mt-4 bg-muted" />
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-muted-foreground flex items-center text-sm uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 mr-2 text-amber-500" /> Needs Review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-amber-600">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : stats?.incorrectAnswers || 0}
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Questions List */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6 flex items-center">
            <BookOpen className="w-6 h-6 mr-3 text-primary" />
            Study Deck
          </h2>

          {isLoadingQuestions ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
            </div>
          ) : questions?.length === 0 ? (
            <div className="bg-card border-2 border-dashed border-primary/20 rounded-2xl p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3 text-foreground">Your deck is empty</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg leading-relaxed">
                Upload a photo of a multiple-choice question. The AI will extract it into a personalized flashcard.
              </p>
              <Button onClick={uploadClick} size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                <Upload className="w-5 h-5 mr-2" />
                Upload your first question
              </Button>
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
                            <Badge variant={q.answeredCorrectly ? "default" : "destructive"} className={`text-xs font-medium px-2 py-0.5 rounded-md ${q.answeredCorrectly ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}`}>
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
                        <p className="font-medium text-foreground line-clamp-2 leading-relaxed text-lg">
                          {q.questionText}
                        </p>
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
      </main>
    </div>
  );
}