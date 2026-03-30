import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  useListOutlineSections,
  useDeepExplainSection,
  useChatAboutSection,
  useUpdateOutlineSection,
  getListOutlineSectionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Sparkles, BookOpen, MessageCircle, Send, GraduationCap, Pencil, Save, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function OutlineSectionDetail() {
  const params = useParams<{ id: string; sectionId: string }>();
  const projectId = parseInt(params.id!, 10);
  const sectionId = parseInt(params.sectionId!, 10);
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data: sections } = useListOutlineSections(projectId);
  const section = sections?.find((s) => s.id === sectionId);

  const deepExplainMutation = useDeepExplainSection({
    mutation: {
      onError: () => {
        toast({ title: "Failed to generate explanation", variant: "destructive" });
      },
    },
  });

  const chatMutation = useChatAboutSection({
    mutation: {
      onSuccess: (data) => {
        if (data.reply) {
          setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        }
      },
      onError: () => {
        toast({ title: "Failed to get response", variant: "destructive" });
      },
    },
  });

  const queryClient = useQueryClient();

  const updateSectionMutation = useUpdateOutlineSection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Section updated" });
        queryClient.invalidateQueries({ queryKey: getListOutlineSectionsQueryKey(projectId) });
        setIsEditing(false);
      },
      onError: () => {
        toast({ title: "Failed to update section", variant: "destructive" });
      },
    },
  });

  const startEditing = () => {
    if (!section) return;
    setEditTitle(section.title);
    setEditContent(section.content);
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!editTitle.trim()) return;
    updateSectionMutation.mutate({
      id: projectId,
      sectionId,
      data: { title: editTitle, content: editContent },
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleDeepExplain = () => {
    deepExplainMutation.mutate({ id: projectId, sectionId });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    chatMutation.mutate({
      id: projectId,
      sectionId,
      data: {
        message: userMsg,
        conversationHistory: chatMessages,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const suggestions = [
    "Explain this section in simple terms",
    "What are the key concepts I need to know?",
    "Can you give me real-world examples?",
    "How might this appear on an exam?",
  ];

  if (!section) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/project/${projectId}`} className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Project
          </Link>
          {!isEditing && (
            <Button variant="ghost" size="icon" onClick={startEditing} className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <Card className="shadow-lg border-0 bg-card rounded-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          <CardContent className="p-8 md:p-10">
            {isEditing ? (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-base font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Content</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[200px] text-base leading-relaxed"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveEdit} disabled={updateSectionMutation.isPending} size="sm">
                    {updateSectionMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
            <div className="mb-6">
              <span className="inline-block bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-md mb-4">
                Outline Section
              </span>
              <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground leading-tight mb-4">
                {section.title}
              </h1>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleDeepExplain}
            disabled={deepExplainMutation.isPending}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg rounded-xl px-6 h-12 text-base"
          >
            {deepExplainMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
            Deep Dive into Principles
          </Button>
          <Button
            onClick={() => setShowChat(!showChat)}
            variant={showChat ? "default" : "outline"}
            className={`rounded-xl px-6 h-12 text-base ${showChat ? "" : "border-border"}`}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Ask Follow-up
          </Button>
        </div>

        {deepExplainMutation.isPending && (
          <Card className="shadow-lg border-0 bg-card rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 animate-pulse" />
            <CardContent className="p-8 space-y-6">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <Skeleton className="h-6 w-40" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        )}

        {deepExplainMutation.data && (
          <Card className="shadow-lg border-0 bg-card rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardContent className="p-8 md:p-10">
              <h3 className="text-lg font-serif font-bold text-foreground mb-5 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-violet-600" />
                Key Principles
              </h3>
              <div className="space-y-6">
                {deepExplainMutation.data.principles.map((p, i) => (
                  <div key={i} className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-xl p-6 border border-violet-100">
                    <h4 className="font-bold text-foreground text-base mb-2 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-violet-600" />
                      {p.name}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed mb-3">{p.description}</p>
                    <Separator className="my-3 bg-violet-100" />
                    <p className="text-foreground/90 leading-relaxed text-sm italic">{p.howItApplies}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-5 bg-muted/50 rounded-xl border border-border">
                <p className="font-semibold text-foreground mb-1">Summary</p>
                <p className="text-muted-foreground leading-relaxed">{deepExplainMutation.data.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {showChat && (
          <Card className="shadow-lg border-0 bg-card rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
            <CardContent className="p-8">
              <h3 className="text-lg font-serif font-bold text-foreground mb-5 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                Ask About This Section
              </h3>

              {chatMessages.length === 0 && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">Try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setChatInput(s);
                          setChatMessages([{ role: "user", content: s }]);
                          chatMutation.mutate({
                            id: projectId,
                            sectionId,
                            data: { message: s, conversationHistory: [] },
                          });
                        }}
                        className="text-sm px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.length > 0 && (
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about this section..."
                  className="flex-1 h-12 rounded-xl border border-border bg-muted/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
      </main>
    </div>
  );
}
