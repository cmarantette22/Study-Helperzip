import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuit,
  FileText,
  LineChart,
  BookOpenCheck,
  Lightbulb,
  Layers,
  CheckCircle2,
  Star,
  Upload,
  Target,
  Sparkles,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* 1. Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Study Buddy</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </a>
            <a href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                Get Started
              </Button>
            </a>
          </div>

          <button
            className="md:hidden text-slate-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-4 flex flex-col gap-4">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="/login" className="text-slate-300 hover:text-white transition-colors py-2">Sign In</a>
            <a href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-full">
                Get Started
              </Button>
            </a>
          </div>
        )}
      </header>

      {/* 2. Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Study Assistant</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-[1.1]">
                Study Smarter. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Score Higher.</span>
              </h1>
              <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
                Upload your study materials, and let AI generate smart quizzes with detailed explanations. Master your exams faster than ever before.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/signup">
                  <Button size="lg" className="h-14 px-8 text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-full sm:w-auto">
                    Get Started Free
                  </Button>
                </a>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base border-slate-700 text-slate-100 bg-white/10 hover:bg-white/20 rounded-full w-full sm:w-auto gap-2">
                    See How It Works <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Mock app UI */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="relative shadow-2xl rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="h-12 bg-slate-950 border-b border-slate-800 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <div className="mx-auto text-xs text-slate-500 font-medium">Practice Quiz: Biology 101</div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-0">Question 4 of 20</Badge>
                    <span className="text-sm font-medium text-emerald-400">85% Accuracy</span>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-6 leading-snug">
                    Which cellular organelle is responsible for synthesizing proteins from amino acids?
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Nucleus', correct: false },
                      { label: 'Mitochondria', correct: false },
                      { label: 'Ribosome', correct: true },
                      { label: 'Golgi apparatus', correct: false },
                    ].map((opt, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${opt.correct
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                          : 'bg-slate-800/50 border-slate-700 text-slate-300'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${opt.correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600'}`}>
                          {opt.correct && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-bold text-indigo-400">AI Explanation</span>
                    </div>
                    <p className="text-sm text-indigo-100/80 leading-relaxed">
                      Correct! Ribosomes are the sites of protein synthesis, where RNA is translated into amino acid chains. Mitochondria produce energy (ATP), while the nucleus stores DNA.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof */}
      <div className="bg-indigo-600 text-white py-4 border-y border-indigo-500">
        <div className="container mx-auto px-4 flex flex-wrap justify-center items-center gap-x-12 gap-y-4 text-sm font-medium">
          <span className="opacity-90 flex items-center gap-2"><Target className="w-4 h-4" /> Trusted by 5,000+ students</span>
          <span className="hidden md:inline opacity-40 text-lg">•</span>
          <span className="opacity-90 flex items-center gap-2"><BookOpenCheck className="w-4 h-4" /> 1M+ Questions Answered</span>
          <span className="hidden md:inline opacity-40 text-lg">•</span>
          <span className="opacity-90 flex items-center gap-2"><LineChart className="w-4 h-4" /> 23% Average Score Increase</span>
        </div>
      </div>

      {/* 4. Features */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Everything you need to master your material</h2>
            <p className="text-lg text-slate-600">Our AI does the heavy lifting of extracting and organizing questions, so you can focus 100% on actually learning.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BrainCircuit, title: "AI Question Parsing", desc: "Instantly extract multiple-choice questions from any photo, document, or screenshot." },
              { icon: FileText, title: "PDF Import", desc: "Upload entire study guides or past exams. We'll digitize and organize them into interactive quizzes." },
              { icon: Target, title: "Smart Quiz Mode", desc: "Practice with adaptive quizzes that focus on your weak points and reinforce your knowledge." },
              { icon: Lightbulb, title: "Detailed Explanations", desc: "Get instant AI feedback on exactly why an answer is right or wrong, acting as a 24/7 tutor." },
              { icon: LineChart, title: "Progress Tracking", desc: "Visualize your accuracy over time. Know exactly when you're ready for the real exam." },
              { icon: Layers, title: "Multi-Subject Projects", desc: "Organize your study materials by class, certification, or topic with dedicated project spaces." }
            ].map((feature, i) => (
              <Card key={i} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">How Study Buddy Works</h2>
            <p className="text-lg text-slate-600">Turn raw materials into an interactive learning experience in seconds.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              { num: "01", icon: Upload, title: "Upload Material", desc: "Snap a photo of a worksheet or upload a PDF study guide." },
              { num: "02", icon: BrainCircuit, title: "Practice", desc: "Take auto-generated quizzes. The AI grades your answers instantly." },
              { num: "03", icon: BookOpenCheck, title: "Master", desc: "Review detailed explanations for mistakes until you hit 100%." }
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i !== 2 && <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] border-t-2 border-dashed border-indigo-200"></div>}
                <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-6 relative z-10 text-indigo-600">
                  <step.icon className="w-10 h-10" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm border-2 border-white">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-16 text-center tracking-tight">Loved by high achievers</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                quote: "I used to spend hours making flashcards from my nursing PDFs. Now I just upload them and start practicing immediately. My quiz scores went from 70s to 90s.",
                author: "Sarah J.",
                role: "Nursing Student",
                rating: 5
              },
              {
                quote: "The AI explanations are a game changer. When I get an AWS certification question wrong, it tells me exactly why the distractors are incorrect. It's like having a tutor.",
                author: "David Chen",
                role: "Cloud Engineer",
                rating: 5
              },
              {
                quote: "Study Buddy turned my messy screenshots of practice problems into a beautifully organized study regimen. Worth every penny for finals week alone.",
                author: "Elena Rodriguez",
                role: "Law Student",
                rating: 5
              }
            ].map((test, i) => (
              <Card key={i} className="bg-slate-50 border-none shadow-sm">
                <CardContent className="pt-8 pb-6 px-8 flex flex-col h-full">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[...Array(test.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 leading-relaxed mb-8 flex-grow">"{test.quote}"</p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {test.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{test.author}</div>
                      <div className="text-slate-500 text-xs">{test.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Pricing */}
      <section id="pricing" className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-400">Invest in your education. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
            {/* Monthly */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-xl font-medium text-slate-300">Monthly Plan</CardTitle>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                  $15
                  <span className="ml-1 text-xl font-medium text-slate-500">/mo</span>
                </div>
                <CardDescription className="text-slate-400 mt-2">Pause or cancel anytime.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 text-slate-300 mt-4">
                  {['Unlimited PDF & Image Uploads', 'AI Question Extraction', 'Detailed Answer Explanations', 'Progress Analytics'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <a href="/signup" className="w-full">
                  <Button className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white" variant="secondary">Get Started Monthly</Button>
                </a>
              </CardFooter>
            </Card>

            {/* Annual */}
            <Card className="bg-gradient-to-b from-indigo-600 to-indigo-900 border-indigo-500 text-white md:scale-105 shadow-2xl shadow-indigo-900/50">
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle className="text-xl font-medium text-indigo-100">Annual Plan</CardTitle>
                  <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400 border-none font-bold">BEST VALUE</Badge>
                </div>
                <div className="mt-2 flex items-baseline text-5xl font-extrabold">
                  $100
                  <span className="ml-1 text-xl font-medium text-indigo-300">/yr</span>
                </div>
                <CardDescription className="text-indigo-200 mt-2">Save $80 compared to monthly.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 text-indigo-50 mt-4">
                  {['Unlimited PDF & Image Uploads', 'AI Question Extraction', 'Detailed Answer Explanations', 'Progress Analytics', 'Priority Support'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <a href="/signup" className="w-full">
                  <Button className="w-full h-12 bg-white text-indigo-900 hover:bg-slate-100 font-bold">Get Started Annually</Button>
                </a>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* 8. CTA Banner */}
      <section className="py-20 bg-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Ready to ace your exams?</h2>
          <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">Join thousands of students who are studying smarter, not harder.</p>
          <a href="/signup">
            <Button size="lg" className="h-14 px-10 text-lg font-bold bg-white text-indigo-600 hover:bg-slate-100 rounded-full shadow-lg">
              Start Studying Now
            </Button>
          </a>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-slate-400 text-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-slate-300 text-base">Study Buddy</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Support</a>
            </div>
            <div>
              &copy; {new Date().getFullYear()} Study Buddy Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
