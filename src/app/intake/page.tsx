"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { isDevModeEnabled } from "@/lib/dev-auth";
import { ListBuilder } from "@/components/ListBuilder";
// Voice input available but hidden for now
// import { MicButton, VoiceInputDivider } from "@/components/MicButton";

// ============================================
// Types
// ============================================

type QuestionType = "text" | "list-builder";

interface BaseQuestion {
  id: string;
  question: string;
  subtitle?: string;
  manifestPath: string;
}

interface TextQuestion extends BaseQuestion {
  type: "text";
  placeholder: string;
  multiline?: boolean;
}

interface ListBuilderQuestion extends BaseQuestion {
  type: "list-builder";
  itemFields: { key: string; placeholder: string; width?: string }[];
  addButtonText: string;
  minItems?: number;
  maxItems?: number;
}

type IntakeQuestion = TextQuestion | ListBuilderQuestion;

interface ListItem {
  id: string;
  [key: string]: string;
}

type AnswerValue = string | ListItem[];

interface XProfile {
  username?: string;
  name?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
}

interface ProfileAnalysis {
  inferred: {
    likely_passions: string[];
    likely_work: string;
    tone_and_voice: string;
    possible_values: string[];
    life_phase_guess: string;
  };
  gaps: {
    id: string;
    question: string;
    why_asking: string;
  }[];
  prefill: {
    name: string;
    location: string;
    passions_hint: string;
  };
}

// ============================================
// Static Questions (fallback for non-X flow)
// ============================================

const STATIC_QUESTIONS: IntakeQuestion[] = [
  {
    id: "name",
    question: "What should I call you?",
    type: "text",
    placeholder: "Your name or nickname",
    manifestPath: "identity.name",
  },
  {
    id: "birthday",
    question: "When's your birthday?",
    subtitle: "So I can remember.",
    type: "text",
    placeholder: "March 15, 1990",
    manifestPath: "temporal.birthday",
  },
  {
    id: "passions",
    question: "What are you passionate about?",
    subtitle: "The things that light you up, that you could talk about for hours.",
    type: "text",
    placeholder: "Making things, writing, music, helping people...",
    manifestPath: "identity.passions",
    multiline: true,
  },
  {
    id: "superpowers",
    question: "What are you really good at?",
    subtitle: "Your unfair advantages. What do people come to you for?",
    type: "text",
    placeholder: "Writing, reading people, creative problem-solving...",
    manifestPath: "identity.superpowers",
    multiline: true,
  },
  {
    id: "interests",
    question: "What are you obsessed with?",
    subtitle: "Topics you can't stop reading about. Rabbit holes you fall into. People who fascinate you.",
    type: "text",
    placeholder: "Technology, history, space travel, mundane inventions that changed the world...",
    manifestPath: "interests.topics",
    multiline: true,
  },
  {
    id: "future",
    question: "Wave a magic wand. It's 5 years from now and everything worked out.",
    subtitle: "What does your life look like? Be specific and vivid.",
    type: "text",
    placeholder: "Where are you? What are you doing? Who's there?",
    manifestPath: "dreams.vivid_future_scenes",
    multiline: true,
  },
  {
    id: "challenges",
    question: "What's holding you back?",
    subtitle: "The stuff you struggle with. Be honest.",
    type: "text",
    placeholder: "Self-discipline, believing in myself, staying focused...",
    manifestPath: "growth.current_challenges",
    multiline: true,
  },
  {
    id: "fears",
    question: "What are you afraid of?",
    subtitle: "The deep ones. What keeps you up at night?",
    type: "text",
    placeholder: "Being unremarkable, running out of time, regret...",
    manifestPath: "growth.fears",
    multiline: true,
  },
  {
    id: "values",
    question: "What values are non-negotiable for you?",
    subtitle: "The principles you live by. What you stand for.",
    type: "text",
    placeholder: "Honesty, curiosity, courage, standing up for what's right...",
    manifestPath: "identity.values",
    multiline: true,
  },
  {
    id: "purpose",
    question: "Do you know your purpose?",
    subtitle: "The thing you were born to do. It's okay if you don't know yet.",
    type: "text",
    placeholder: "To build the world's largest..., to be the world's best...",
    manifestPath: "identity.purpose",
    multiline: true,
  },
  {
    id: "life_story",
    question: "Give me the quick version of your story.",
    subtitle: "Where you started, where you've been, how you got here. The highlights and lowlights.",
    type: "text",
    placeholder: "Born in Toronto, moved around a lot, found my thing in...",
    manifestPath: "life_context.life_story_summary",
    multiline: true,
  },
  {
    id: "location",
    question: "Where do you live?",
    type: "text",
    placeholder: "City, neighborhood...",
    manifestPath: "life_context.current_location",
  },
];

// ============================================
// Constants
// ============================================

const STORAGE_KEY = "yellowpill_intake_progress";

const LOADING_MESSAGES = [
  "Processing your answers...",
  "Building your profile...",
  "Learning who you are...",
  "Preparing your feed...",
  "Almost there...",
];

const ANALYZING_MESSAGES = [
  "Reading your profile...",
  "Noticing patterns...",
  "Understanding who you are...",
  "Figuring out what to ask...",
];

// ============================================
// Component
// ============================================

export default function IntakePage() {
  const router = useRouter();

  // Flow state
  const [flowType, setFlowType] = useState<"loading" | "analyzing" | "x" | "standard">("loading");
  const [xProfile, setXProfile] = useState<XProfile | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);

  // Question state
  const [questions, setQuestions] = useState<IntakeQuestion[]>(STATIC_QUESTIONS);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const isLastQuestion = currentStep === questions.length - 1;

  // ============================================
  // Check for X profile and initialize
  // ============================================

  useEffect(() => {
    const initialize = async () => {
      // Check for X profile cookie
      const xProfileCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("x_profile="));

      if (xProfileCookie) {
        try {
          const profileData = JSON.parse(decodeURIComponent(xProfileCookie.split("=")[1]));
          setXProfile(profileData);
          setFlowType("analyzing");

          // Clear the cookie
          document.cookie = "x_profile=; path=/; max-age=0";

          // Analyze the profile
          await analyzeXProfile(profileData);
        } catch (e) {
          console.error("Failed to parse X profile:", e);
          setFlowType("standard");
        }
      } else {
        // Check for saved progress
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const { answers: savedAnswers, step } = JSON.parse(saved);
            if (savedAnswers && typeof savedAnswers === "object") {
              setAnswers(savedAnswers);
              if (typeof step === "number" && step < STATIC_QUESTIONS.length) {
                setCurrentStep(step);
              }
            }
          } catch (e) {
            console.error("Failed to parse saved progress:", e);
          }
        }
        setFlowType("standard");
      }
    };

    if (!checkingAuth) {
      initialize();
    }
  }, [checkingAuth]);

  const analyzeXProfile = async (profile: XProfile) => {
    try {
      const response = await fetch("/api/analyze-x-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xProfile: profile }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze profile");
      }

      const { analysis, summary } = await response.json();
      setProfileAnalysis(analysis);
      setProfileSummary(summary);

      // Pre-fill answers from analysis
      const prefillAnswers: Record<string, string> = {};
      if (analysis.prefill.name) {
        prefillAnswers.name = analysis.prefill.name;
      }
      if (analysis.prefill.location) {
        prefillAnswers.location = analysis.prefill.location;
      }

      // Store inferred data for later
      prefillAnswers._inferred = JSON.stringify(analysis.inferred);
      setAnswers(prefillAnswers);

      // Build questions from gaps + core questions
      const dynamicQuestions: IntakeQuestion[] = analysis.gaps.map((gap: { id: string; question: string }) => ({
        id: gap.id,
        question: gap.question,
        type: "text" as const,
        placeholder: "Be honest...",
        manifestPath: `adaptive.${gap.id}`,
        multiline: true,
      }));

      // Add a couple fixed questions that X can't answer
      const coreQuestions: IntakeQuestion[] = [
        {
          id: "future",
          question: "What does your ideal life look like in 5 years?",
          subtitle: "Be specific. Where are you? What are you doing? Who's there?",
          type: "text",
          placeholder: "Paint the picture...",
          manifestPath: "dreams.vivid_future_scenes",
          multiline: true,
        },
      ];

      setQuestions([...dynamicQuestions, ...coreQuestions]);
      setFlowType("x");
    } catch (e) {
      console.error("Profile analysis failed:", e);
      setFlowType("standard");
    }
  };

  // ============================================
  // Auth check
  // ============================================

  useEffect(() => {
    const checkAuth = async () => {
      if (isDevModeEnabled()) {
        setCheckingAuth(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: manifest } = await supabase
        .from("soul_manifests")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (manifest) {
        clearProgress();
        router.push("/feed");
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  // ============================================
  // Progress management
  // ============================================

  const saveProgress = useCallback(
    (newAnswers: Record<string, AnswerValue>, step: number) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: newAnswers, step })
      );
    },
    []
  );

  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ============================================
  // Loading messages rotation
  // ============================================

  useEffect(() => {
    if (!loading && flowType !== "analyzing") return;

    const messages = flowType === "analyzing" ? ANALYZING_MESSAGES : LOADING_MESSAGES;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading, flowType]);

  // ============================================
  // Handlers
  // ============================================

  const handleExit = () => {
    if (isDevModeEnabled()) {
      localStorage.removeItem("yellowpill_dev_mode");
      document.cookie = "yellowpill_dev_mode=; path=/; max-age=0";
    }
    router.push("/");
  };

  const getCurrentAnswer = (): AnswerValue => {
    if (!currentQuestion) return "";
    const saved = answers[currentQuestion.id];
    if (saved !== undefined) return saved;

    switch (currentQuestion.type) {
      case "text":
        return "";
      case "list-builder":
        return [];
      default:
        return "";
    }
  };

  const updateAnswer = (value: AnswerValue) => {
    if (!currentQuestion) return;
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    if (flowType === "standard") {
      saveProgress(newAnswers, currentStep);
    }
  };

  const canContinue = (): boolean => {
    if (!currentQuestion) return false;
    const answer = getCurrentAnswer();

    switch (currentQuestion.type) {
      case "text":
        return (answer as string).trim().length > 0;
      case "list-builder": {
        const listAnswer = answer as ListItem[];
        const q = currentQuestion as ListBuilderQuestion;
        if (!q.minItems || q.minItems === 0) {
          return true;
        }
        return listAnswer.some((item) =>
          Object.entries(item).some(
            ([key, val]) => key !== "id" && val.trim().length > 0
          )
        );
      }
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canContinue()) return;

    if (isLastQuestion) {
      handleSubmit(answers);
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (flowType === "standard") {
        saveProgress(answers, nextStep);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      if (flowType === "x" && profileSummary) {
        // Go back to summary view
        setFlowType("x");
        setCurrentStep(-1);
      } else {
        handleExit();
      }
    } else {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (flowType === "standard") {
        saveProgress(answers, prevStep);
      }
    }
  };

  const handleSubmit = async (finalAnswers: Record<string, AnswerValue>) => {
    setLoading(true);
    setError(null);

    // Flatten answers for API
    const flattenedAnswers: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(finalAnswers)) {
      if (key === "_inferred") continue; // Handle separately
      if (typeof value === "string") {
        flattenedAnswers[key] = value;
      } else if (Array.isArray(value)) {
        flattenedAnswers[key] = value.filter((item) =>
          Object.entries(item).some(
            ([k, v]) => k !== "id" && v.trim().length > 0
          )
        );
      }
    }

    // Add inferred data if from X flow
    if (finalAnswers._inferred) {
      flattenedAnswers._inferred = JSON.parse(finalAnswers._inferred as string);
    }

    // Add X profile if available
    if (xProfile) {
      flattenedAnswers._xProfile = xProfile;
    }

    // Dev mode: skip API
    if (isDevModeEnabled()) {
      console.log("Dev mode: Intake answers:", flattenedAnswers);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      clearProgress();
      router.push("/feed");
      return;
    }

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: flattenedAnswers }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      clearProgress();
      router.push("/feed");
    } catch (err) {
      console.error("Intake error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!currentQuestion) return;
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      currentQuestion.type === "text" &&
      !(currentQuestion as TextQuestion).multiline
    ) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleStartQuestions = () => {
    setCurrentStep(0);
  };

  // ============================================
  // Render helpers
  // ============================================

  const renderInput = () => {
    if (!currentQuestion) return null;
    const answer = getCurrentAnswer();

    switch (currentQuestion.type) {
      case "text": {
        const q = currentQuestion as TextQuestion;
        if (q.multiline) {
          return (
            <textarea
              value={answer as string}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder={q.placeholder}
              className="w-full min-h-[150px] resize-none animate-fade-in"
              autoFocus
            />
          );
        }
        return (
          <input
            type="text"
            value={answer as string}
            onChange={(e) => updateAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={q.placeholder}
            className="w-full animate-fade-in"
            autoFocus
          />
        );
      }

      case "list-builder": {
        const q = currentQuestion as ListBuilderQuestion;
        return (
          <div className="animate-fade-in">
            <ListBuilder
              fields={q.itemFields}
              addButtonText={q.addButtonText}
              minItems={q.minItems}
              maxItems={q.maxItems}
              value={answer as ListItem[]}
              onChange={(items) => updateAnswer(items)}
            />
          </div>
        );
      }
    }
  };

  // ============================================
  // Render states
  // ============================================

  if (checkingAuth || flowType === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-[#FCC800] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (flowType === "analyzing") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
        <div className="flex flex-col items-center gap-8">
          {xProfile?.profileImage && (
            <img
              src={xProfile.profileImage}
              alt=""
              className="w-20 h-20 rounded-full border-2 border-[#FCC800] animate-pulse"
            />
          )}
          <div className="animate-spin-slow">
            <Image
              src="/images/assets/yellow_pill_logo.png"
              alt="Loading"
              width={60}
              height={60}
              className="drop-shadow-[0_0_30px_rgba(252,200,0,0.4)]"
            />
          </div>
          <p className="text-[var(--foreground-muted)] text-lg animate-pulse text-center">
            {loadingMessage}
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
        <div className="flex flex-col items-center gap-8">
          <div className="animate-spin-slow">
            <Image
              src="/images/assets/yellow_pill_logo.png"
              alt="Loading"
              width={80}
              height={80}
              className="drop-shadow-[0_0_30px_rgba(252,200,0,0.4)]"
            />
          </div>
          <p className="text-[var(--foreground-muted)] text-lg animate-pulse">
            {loadingMessage}
          </p>
        </div>
      </main>
    );
  }

  // X Flow: Show summary before questions
  if (flowType === "x" && currentStep === -1 && profileSummary) {
    return (
      <main className="min-h-screen flex flex-col px-6 py-8 bg-black">
        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={handleExit}
              className="p-2 -mr-2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors"
              title="Exit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Profile summary */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-8">
              {xProfile?.profileImage && (
                <img
                  src={xProfile.profileImage}
                  alt=""
                  className="w-16 h-16 rounded-full border-2 border-[#333]"
                />
              )}
              <div>
                <h2 className="text-xl font-medium">{xProfile?.name || "Welcome"}</h2>
                {xProfile?.username && (
                  <p className="text-[var(--foreground-muted)]">@{xProfile.username}</p>
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-8">
              <p className="text-[var(--foreground-muted)] leading-relaxed">
                {profileSummary}
              </p>
            </div>

            <p className="text-[var(--foreground-subtle)] text-sm mb-8">
              I have a few questions that will help me understand you beyond your public profile.
            </p>

            <button
              onClick={handleStartQuestions}
              className="btn-primary w-full"
            >
              Let's go
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Standard question flow
  return (
    <main className="min-h-screen flex flex-col px-6 py-8 bg-black">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-[var(--foreground-muted)]">
            {currentStep + 1} / {questions.length}
          </span>
          <button
            onClick={handleExit}
            className="p-2 -mr-2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors"
            title="Exit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              {flowType === "x" ? "A few more questions" : "Learning who you are"}
            </span>
          </div>
          <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FCC800] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Question */}
        {currentQuestion && (
          <div className="flex-1 flex flex-col" key={currentStep}>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2 leading-snug animate-fade-in">
              {currentQuestion.question}
            </h1>
            {currentQuestion.subtitle && (
              <p className="text-[var(--foreground-muted)] mb-6 animate-fade-in">
                {currentQuestion.subtitle}
              </p>
            )}

            <div className="mt-4 flex-1">
              {renderInput()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8">
          <button
            onClick={handleBack}
            className="btn-secondary"
          >
            {currentStep === 0 && flowType !== "x" ? "Exit" : "Back"}
          </button>

          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className="btn-primary disabled:opacity-50"
          >
            {isLastQuestion ? "Create My Feed" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
