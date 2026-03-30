import { useState, useRef, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetQuestion, 
  useCheckAnswer, 
  useExplainAnswers,
  useDeepExplainQuestion,
  useChatAboutQuestion,
  useDeleteQuestion,
  useUpdateQuestion,
  getGetQuestionQueryKey,
  getListQuestionsQueryKey,
  getGetQuestionStatsQueryKey,
  getListProjectQuestionsQueryKey,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Trash2, Loader2, Sparkles, Lightbulb, BookOpen, MessageCircle, Send, GraduationCap, AlertTriangle, Pencil, Save, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function QuestionDetail() {
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: question, isLoading: isQuestionLoading } = useGetQuestion(id, {
    query: { enabled: !!id }
  });

  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const checkAnswerMutation = useCheckAnswer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQuestionQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
      }
    }
  });

  const explainAnswersMutation = useExplainAnswers({
    mutation: {}
  });

  const deepExplainMutation = useDeepExplainQuestion({
    mutation: {}
  });

  const chatMutation = useChatAboutQuestion({
    mutation: {
      onSuccess: (data) => {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    }
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editChoices, setEditChoices] = useState<{ label: string; text: string; isCorrect: boolean }[]>([]);

  const updateQuestionMutation = useUpdateQuestion({
    mutation: {
      onSuccess: () => {
        toast({ title: "Question updated" });
        queryClient.invalidateQueries({ queryKey: getGetQuestionQueryKey(id) });
        setIsEditing(false);
      },
      onError: () => {
        toast({ title: "Failed to update question", variant: "destructive" });
      },
    },
  });

  const startEditing = () => {
    if (!question) return;
    setEditQuestionText(question.questionText);
    setEditChoices(question.choices.map((c) => ({ label: c.label, text: c.text, isCorrect: c.isCorrect })));
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!editQuestionText.trim()) return;
    updateQuestionMutation.mutate({
      id,
      data: { questionText: editQuestionText, choices: editChoices },
    });
  };

  const updateEditChoice = (index: number, field: string, value: string | boolean) => {
    setEditChoices((prev) =>
      prev.map((c, i) => {
        if (i !== index) {
          if (field === "isCorrect" && value === true) return { ...c, isCorrect: false };
          return c;
        }
        return { ...c, [field]: value };
      })
    );
  };

  const deleteQuestionMutation = useDeleteQuestion({
    mutation: {
      onSuccess: () => {
        toast({ title: "Question deleted" });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
        if (question?.projectId) {
          queryClient.invalidateQueries({ queryKey: getListProjectQuestionsQueryKey(question.projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(question.projectId) });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        }
        setLocation(question?.projectId ? `/project/${question.projectId}` : "/");
      }
    }
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const isSubmitting = checkAnswerMutation.isPending;
  const isChecking = question?.answered;
  const checkResult = checkAnswerMutation.data;
  const explanations = explainAnswersMutation.data?.explanations;
  const deepExplanation = deepExplainMutation.data;
  
  const correctChoiceId = question?.choices.find(c => c.isCorrect)?.id;

  const handleSubmit = () => {
    if (!selectedChoiceId) return;
    checkAnswerMutation.mutate({ id, data: { choiceId: selectedChoiceId } });
  };

  const handleExplain = () => {
    explainAnswersMutation.mutate({ id });
  };

  const handleDeepExplain = () => {
    deepExplainMutation.mutate({ id });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    chatMutation.mutate({ 
      id, 
      data: { 
        message: userMessage, 
        conversationHistory: chatMessages 
      } 
    });
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteQuestionMutation.mutate({ id });
    setIsDeleteDialogOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  if (isQuestionLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6 mt-12">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <h2 className="text-xl font-serif font-bold mb-6 text-foreground">Question not found</h2>
        <Button asChild variant="outline" className="border-primary text-primary">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Study Deck
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <div className="bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={question?.projectId ? `/project/${question.projectId}` : "/"} className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Deck
          </Link>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <Button variant="ghost" size="icon" onClick={startEditing} className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <Card className="shadow-xl border-0 bg-card overflow-hidden rounded-2xl">
          <div className="h-2 w-full flex">
            {question.answered ? (
              <div className={`h-full w-full ${question.answeredCorrectly ? 'bg-green-500' : 'bg-red-500'}`} />
            ) : (
              <div className="h-full bg-primary w-full" />
            )}
          </div>
          <CardContent className="p-6 md:p-8">
            {isEditing ? (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Question Text</label>
                  <Textarea
                    value={editQuestionText}
                    onChange={(e) => setEditQuestionText(e.target.value)}
                    className="min-h-[100px] text-base"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Answer Choices</label>
                  {editChoices.map((choice, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {choice.label}
                      </span>
                      <Input
                        value={choice.text}
                        onChange={(e) => updateEditChoice(i, "text", e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant={choice.isCorrect ? "default" : "outline"}
                        size="sm"
                        className="text-xs flex-shrink-0"
                        onClick={() => updateEditChoice(i, "isCorrect", true)}
                      >
                        {choice.isCorrect ? <Check className="w-3 h-3 mr-1" /> : null}
                        Correct
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveEdit} disabled={updateQuestionMutation.isPending} size="sm">
                    {updateQuestionMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
            <>
            <div className="mb-8">
              <Badge variant="outline" className="mb-3 text-primary border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium uppercase tracking-widest">
                Question {question.id}
              </Badge>
              <h2 className="text-lg md:text-xl font-serif text-foreground leading-relaxed font-bold">
                {question.questionText}
              </h2>
            </div>

            <RadioGroup 
              value={selectedChoiceId?.toString() || (question.answered && checkResult?.selectedChoiceId ? checkResult.selectedChoiceId.toString() : "")} 
              onValueChange={(val) => !isChecking && setSelectedChoiceId(parseInt(val, 10))}
              className="space-y-4"
              disabled={isChecking}
            >
              {question.choices.map((choice) => {
                const isSelected = selectedChoiceId === choice.id || (isChecking && checkResult?.selectedChoiceId === choice.id);
                const isCorrectChoice = isChecking && choice.id === correctChoiceId;
                const isWrongChoice = isChecking && isSelected && !isCorrectChoice;
                
                const explanation = explanations?.find(e => e.choiceId === choice.id);

                return (
                  <div key={choice.id} className="relative">
                    <Label
                      htmlFor={`choice-${choice.id}`}
                      className={`
                        flex flex-col p-5 border-2 rounded-xl cursor-pointer transition-all duration-200
                        ${!isChecking && isSelected ? "border-primary bg-primary/5 shadow-md transform scale-[1.01]" : ""}
                        ${!isChecking && !isSelected ? "border-border hover:border-primary/40 hover:bg-muted/30" : ""}
                        ${isCorrectChoice ? "border-green-500 bg-green-50 shadow-md transform scale-[1.01]" : ""}
                        ${isWrongChoice ? "border-red-500 bg-red-50" : ""}
                        ${isChecking && !isCorrectChoice && !isWrongChoice ? "opacity-60 border-border bg-card" : ""}
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <RadioGroupItem 
                          value={choice.id.toString()} 
                          id={`choice-${choice.id}`} 
                          className="mt-1 sr-only"
                        />
                        
                        <div className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                          ${isCorrectChoice ? "bg-green-500 text-white" : ""}
                          ${isWrongChoice ? "bg-red-500 text-white" : ""}
                          ${!isChecking && isSelected ? "bg-primary text-primary-foreground" : ""}
                          ${!isChecking && !isSelected ? "bg-muted text-muted-foreground group-hover:bg-muted-foreground/20" : ""}
                          ${isChecking && !isCorrectChoice && !isWrongChoice ? "bg-muted text-muted-foreground" : ""}
                        `}>
                          {isCorrectChoice ? <Check className="w-6 h-6" /> : isWrongChoice ? <X className="w-6 h-6" /> : choice.label}
                        </div>
                        
                        <div className={`flex-1 text-base leading-relaxed pt-1 font-medium ${isCorrectChoice ? "text-green-900" : isWrongChoice ? "text-red-900" : "text-foreground"}`}>
                          {choice.text}
                        </div>
                      </div>

                      {explanation && (
                        <div className={`mt-5 pt-5 border-t ${isCorrectChoice ? "border-green-200" : isWrongChoice ? "border-red-200" : "border-border"} text-base animate-in fade-in slide-in-from-top-2`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full mt-0.5 ${isCorrectChoice ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              <Lightbulb className="w-5 h-5" />
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                              <strong className={`font-semibold ${isCorrectChoice ? "text-green-800" : "text-amber-800"}`}>
                                {isCorrectChoice ? "Why it's right: " : "Why it's wrong: "}
                              </strong>
                              {explanation.explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            </>
            )}
          </CardContent>

          <CardFooter className="bg-muted/40 px-8 py-8 border-t border-border flex flex-col sm:flex-row justify-end gap-4">
            {!isChecking ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedChoiceId || isSubmitting}
                className="w-full sm:w-auto h-12 px-6 text-base font-medium shadow-md transition-transform active:scale-95"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                Submit Answer
              </Button>
            ) : (
              <div className="flex w-full flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-lg font-serif font-bold flex items-center">
                  {question.answeredCorrectly ? (
                    <span className="text-green-600 flex items-center bg-green-50 px-4 py-2 rounded-xl">
                      <Check className="w-6 h-6 mr-3" /> Outstanding!
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center bg-red-50 px-4 py-2 rounded-xl">
                      <X className="w-6 h-6 mr-3" /> Not quite right.
                    </span>
                  )}
                </div>
                <div className="flex gap-3 w-full sm:w-auto flex-wrap">
                  {!explanations && (
                    <Button 
                      variant="secondary" 
                      onClick={handleExplain}
                      disabled={explainAnswersMutation.isPending}
                      className="flex-1 sm:flex-none bg-amber-100 hover:bg-amber-200 text-amber-900 h-12 px-5 shadow-sm font-medium"
                    >
                      {explainAnswersMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                      )}
                      Explain
                    </Button>
                  )}
                  <Button asChild className="flex-1 sm:flex-none h-12 px-6 shadow-md">
                    <Link href="/">Next Question</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>

        {isChecking && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-3">
              {!deepExplanation && (
                <Button
                  variant="outline"
                  onClick={handleDeepExplain}
                  disabled={deepExplainMutation.isPending}
                  className="h-12 px-6 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                >
                  {deepExplainMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <BookOpen className="w-5 h-5 mr-2" />
                  )}
                  Deep Dive into Principles
                </Button>
              )}
              {!showChat && (
                <Button
                  variant="outline"
                  onClick={() => setShowChat(true)}
                  className="h-12 px-6 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Ask a Follow-up
                </Button>
              )}
            </div>

            {deepExplainMutation.isPending && (
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-foreground">Analyzing Key Principles...</h3>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            )}

            {deepExplanation && (
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-foreground">Key Principles</h3>
                  </div>

                  <div className="space-y-6">
                    {deepExplanation.principles.map((principle, index) => (
                      <div key={index} className="bg-muted/30 rounded-xl p-6 border border-border/50">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3">
                            <h4 className="text-base font-bold text-foreground">{principle.name}</h4>
                            <p className="text-muted-foreground leading-relaxed">{principle.description}</p>
                            <Separator className="my-2" />
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                              <p className="text-foreground leading-relaxed text-sm font-medium">{principle.howItApplies}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-5 bg-primary/5 rounded-xl border border-primary/15">
                    <p className="text-foreground leading-relaxed font-medium">
                      <strong className="text-primary">Summary: </strong>
                      {deepExplanation.summary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {showChat && (
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1.5 w-full bg-gradient-to-r from-accent via-primary/70 to-primary" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-accent/10 rounded-full">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-foreground">Ask Your Tutor</h3>
                      <p className="text-sm text-muted-foreground">Ask anything about this question -- the AI will help you understand.</p>
                    </div>
                  </div>

                  {chatMessages.length > 0 && (
                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {chatMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl rounded-bl-md px-5 py-3.5 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-muted-foreground text-sm">Thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {chatMessages.length === 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {[
                        "I don't understand why that's the right answer",
                        "Can you explain this in simpler terms?",
                        "What's the key concept I need to remember?",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setChatInput(suggestion);
                          }}
                          className="text-sm px-4 py-2 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your question..."
                      className="flex-1 h-12 px-5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      disabled={chatMutation.isPending}
                    />
                    <Button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim() || chatMutation.isPending}
                      className="h-12 w-12 rounded-xl p-0 shadow-md"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-serif text-center">Delete Question</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteQuestionMutation.isPending} className="flex-1">
              {deleteQuestionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
