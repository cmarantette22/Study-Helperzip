import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetQuestion, 
  useCheckAnswer, 
  useExplainAnswers, 
  useDeleteQuestion,
  getGetQuestionQueryKey,
  getListQuestionsQueryKey,
  getGetQuestionStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Trash2, Loader2, Sparkles, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    mutation: {
      onSuccess: () => {
        // Data populated in react-query cache automatically via useMutation
      }
    }
  });

  const deleteQuestionMutation = useDeleteQuestion({
    mutation: {
      onSuccess: () => {
        toast({ title: "Question deleted" });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetQuestionStatsQueryKey() });
        setLocation("/");
      }
    }
  });

  const isSubmitting = checkAnswerMutation.isPending;
  const isChecking = question?.answered;
  const checkResult = checkAnswerMutation.data;
  const explanations = explainAnswersMutation.data?.explanations;
  
  const correctChoiceId = question?.choices.find(c => c.isCorrect)?.id;

  const handleSubmit = () => {
    if (!selectedChoiceId) return;
    checkAnswerMutation.mutate({ id, data: { choiceId: selectedChoiceId } });
  };

  const handleExplain = () => {
    explainAnswersMutation.mutate({ id });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionMutation.mutate({ id });
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
        <h2 className="text-3xl font-serif font-bold mb-6 text-foreground">Question not found</h2>
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
      {/* Top Nav */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Deck
          </Link>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <Card className="shadow-xl border-0 bg-card overflow-hidden rounded-2xl">
          <div className="h-2 w-full flex">
            {question.answered ? (
              <div className={`h-full w-full ${question.answeredCorrectly ? 'bg-green-500' : 'bg-red-500'}`} />
            ) : (
              <div className="h-full bg-primary w-full" />
            )}
          </div>
          <CardContent className="p-8 md:p-10">
            <div className="mb-10">
              <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium uppercase tracking-widest">
                Question {question.id}
              </Badge>
              <h2 className="text-2xl md:text-3xl font-serif text-foreground leading-relaxed font-bold">
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
                          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-colors
                          ${isCorrectChoice ? "bg-green-500 text-white" : ""}
                          ${isWrongChoice ? "bg-red-500 text-white" : ""}
                          ${!isChecking && isSelected ? "bg-primary text-primary-foreground" : ""}
                          ${!isChecking && !isSelected ? "bg-muted text-muted-foreground group-hover:bg-muted-foreground/20" : ""}
                          ${isChecking && !isCorrectChoice && !isWrongChoice ? "bg-muted text-muted-foreground" : ""}
                        `}>
                          {isCorrectChoice ? <Check className="w-6 h-6" /> : isWrongChoice ? <X className="w-6 h-6" /> : choice.label}
                        </div>
                        
                        <div className={`flex-1 text-lg leading-relaxed pt-1.5 font-medium ${isCorrectChoice ? "text-green-900" : isWrongChoice ? "text-red-900" : "text-foreground"}`}>
                          {choice.text}
                        </div>
                      </div>

                      {/* Explanation Dropdown Area */}
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
          </CardContent>

          <CardFooter className="bg-muted/40 px-8 py-8 border-t border-border flex flex-col sm:flex-row justify-end gap-4">
            {!isChecking ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedChoiceId || isSubmitting}
                className="w-full sm:w-auto h-14 px-8 text-lg font-medium shadow-md transition-transform active:scale-95"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                Submit Answer
              </Button>
            ) : (
              <div className="flex w-full flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-xl font-serif font-bold flex items-center">
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
                <div className="flex gap-4 w-full sm:w-auto">
                  {!explanations && (
                    <Button 
                      variant="secondary" 
                      onClick={handleExplain}
                      disabled={explainAnswersMutation.isPending}
                      className="w-full sm:w-auto bg-amber-100 hover:bg-amber-200 text-amber-900 h-12 px-6 shadow-sm font-medium"
                    >
                      {explainAnswersMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                      )}
                      Explain Answers
                    </Button>
                  )}
                  <Button asChild className="w-full sm:w-auto h-12 px-8 shadow-md">
                    <Link href="/">Next Question</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}