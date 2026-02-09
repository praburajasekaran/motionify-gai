"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuiz } from "./useQuiz";
import { generateRecommendation } from "./recommendation";
import ContactForm from "./ContactForm";
import InquirySuccess from "./InquirySuccess";
import VerificationSent from "./VerificationSent";
import type { ContactInfo } from "../../lib/inquiries";

type Option = { key: keyof ReturnType<typeof useQuiz>["selections"]; value: string; label: string };

export default function Quiz() {
  const {
    current,
    total,
    selections,
    select,
    setCurrent,
    goBack,
    reset: resetQuiz,
    isComplete,
    startQuiz,
    isWelcomeScreen,
    isContactForm,
    isSuccessScreen,
    showContactForm,
    submitInquiry,
    submittedInquiry,
    verificationSent,
    contactEmail,
    magicLink,
    resendVerification,
  } = useQuiz();
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recommendation = useMemo(() => {
    return isComplete ? generateRecommendation(selections) : null;
  }, [isComplete, selections]);

  const reset = () => {
    resetQuiz();
    setVideoUrl(null);
    setIsGenerating(false);
    setLoadingStep(0);
    setIsSubmitting(false);
  };

  const handleContactSubmit = async (contactInfo: ContactInfo) => {
    if (!recommendation) return;

    setIsSubmitting(true);
    try {
      await submitInquiry(contactInfo, recommendation.title);
      // Success screen will be shown automatically by useQuiz
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackFromContact = () => {
    setCurrent(total - 1); // Go back to last quiz question
  };

  useEffect(() => {
    if (!recommendation) return;

    // Start UI transition
    if (placeholderRef.current && cardRef.current) {
      placeholderRef.current.style.opacity = "0";
      setTimeout(() => {
        if (!placeholderRef.current || !cardRef.current) return;
        placeholderRef.current.style.display = "none";
        cardRef.current.style.display = "block";
        requestAnimationFrame(() => {
          if (cardRef.current) cardRef.current.style.opacity = "1";
        });
      }, 300);
    }

    // Trigger Generation
    const generate = async () => {
      setIsGenerating(true);
      setLoadingStep(0);

      // Progress simulation timer
      const timer = setInterval(() => {
        setLoadingStep((prev: number) => (prev < 3 ? prev + 1 : prev));
      }, 1000);

      try {
        const res = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recommendation),
        });
        const data = await res.json();
        setVideoUrl(data.url);
      } catch (err) {
        console.error("Generation failed", err);
      } finally {
        clearInterval(timer);
        setIsGenerating(false);
      }
    };

    generate();
  }, [recommendation]);

  const LOADING_STEPS = [
    "Analyzing your inputs...",
    "Dreaming up concepts...",
    "Generating video with Veo 3...",
    "Finalizing render..."
  ];

  const questions: { title: string; help: string; key: Option["key"]; options: string[] }[] = [
    { title: "What's your niche?", help: "Help us understand your industry", key: "niche", options: ["Tech", "Healthcare", "Retail", "Real Estate", "Education", "Other"] },
    { title: "Who's your target audience?", help: "Who are you trying to reach?", key: "audience", options: ["Consumers", "Businesses", "Investors", "Employees", "Students"] },
    { title: "What kind of video style appeals to you?", help: "Choose your preferred visual approach", key: "style", options: ["Live Action", "Animation", "Mixed Media", "Motion Graphics", "Minimal Explainer"] },
    { title: "What mood or tone best fits your message?", help: "Set the emotional direction", key: "mood", options: ["Emotional", "Playful", "Inspirational", "Corporate", "Bold"] },
    { title: "What's your ideal duration?", help: "Choose the length that fits your goals", key: "duration", options: ["Reels", "Explainer", "Demo", "Any"] },
  ];

  return (
    <section id="video-style-quiz" className="relative py-24 sm:py-32 overflow-hidden text-white">
      {/* Dark animated background matching original with base fill */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gray-950 -z-20" />
        <div className="absolute inset-0 opacity-[0.85]" style={{
          background:
            "radial-gradient(1200px 600px at 20% 20%, rgba(168,85,247,0.20), transparent 60%)," +
            "radial-gradient(1000px 800px at 80% 30%, rgba(59,130,246,0.18), transparent 60%)," +
            "radial-gradient(900px 700px at 40% 80%, rgba(14,165,233,0.16), transparent 60%)",
          filter: "blur(0px)",
        }} />
        <div className="absolute inset-0" style={{
          background:
            "linear-gradient(120deg, rgba(186,123,255,0.14), rgba(59,130,246,0.12) 40%, rgba(99,102,241,0.12) 70%, rgba(14,165,233,0.10))",
          animation: "panGradient 16s ease-in-out infinite",
        }} />
        <div className="absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.35), rgba(168,85,247,0) 60%)" }} />
        <div className="absolute top-1/2 right-1/4 h-[26rem] w-[26rem] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle at 70% 70%, rgba(59,130,246,0.35), rgba(59,130,246,0) 60%)" }} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Create Your Video Project</h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">Answer 5 quick questions to get your personalized video recommendation</p>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7">
            {/* Welcome Screen */}
            {isWelcomeScreen && (
              <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-8 sm:p-12 text-center">
                <h3 className="text-4xl sm:text-5xl font-bold mb-6">Create Your Perfect Video</h3>
                <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
                  Tell us about your project and we'll recommend the perfect video style tailored to your needs.
                </p>
                <button
                  onClick={startQuiz}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-8 py-4 text-base font-medium text-white shadow-lg hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <span>Get Started</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </div>
            )}

            {/* Quiz Progress - only show when not on welcome screen and not on contact/success */}
            {!isWelcomeScreen && !isContactForm && !isSuccessScreen && (
              <div id="quiz-progress" className="flex items-center gap-3 mb-8 opacity-100 transition-opacity duration-500">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div id="progress-bar" className="h-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${((current + 1) / total) * 100}%` }} />
                </div>
                <span id="progress-text" className="text-sm text-white/60 font-medium">{current + 1} of {total}</span>
              </div>
            )}

            {/* Quiz Questions - only show when not on welcome screen and on quiz questions */}
            {!isWelcomeScreen && !isContactForm && !isSuccessScreen && (
              <div className="space-y-8">
                {questions.map((q, idx) => (
                  <div key={q.title} className={`${idx === current ? 'block quiz-question active' : 'hidden opacity-0'}`}>
                    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-6 sm:p-8">
                      {current > 0 && (
                        <div className="mb-4">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 ring-1 ring-white/10 text-white/80 hover:bg-white/10 transition"
                            onClick={() => goBack()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M15 18l-6-6 6-6" /></svg>
                            Back
                          </button>
                        </div>
                      )}
                      <h3 className="text-2xl sm:text-3xl font-semibold mb-2">{q.title}</h3>
                      <p className="text-white/60 text-sm mb-6">{q.help}</p>
                      <div className="flex flex-wrap gap-3">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-all
                            ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
                            bg-white/5 ring-white/10 text-white/90 hover:bg-white/10 hover:ring-white/20 hover:shadow-md
                            ${selections[q.key] === opt ?
                                'bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-blue-500/20 ring-violet-400/40 text-white shadow-[0_8px_24px_rgba(139,92,246,.25)]' :
                                ''}
                          `}
                            aria-pressed={selections[q.key] === opt}
                            onClick={() => select(q.key, opt)}
                          >
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
                              {iconFor(q.key, opt)}
                            </span>
                            <span>{labelFor(q.key, opt)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contact Form - Step 6 */}
            {isContactForm && (
              <ContactForm
                onSubmit={handleContactSubmit}
                onBack={handleBackFromContact}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Success Screen - Step 7 (Verification or Inquiry Success) */}
            {isSuccessScreen && (verificationSent ? (
              <VerificationSent
                contactEmail={contactEmail}
                magicLink={magicLink}
                onReset={reset}
                onResend={resendVerification}
              />
            ) : submittedInquiry ? (
              <InquirySuccess
                inquiryNumber={submittedInquiry.inquiryNumber}
                contactEmail={submittedInquiry.contactEmail}
                onReset={reset}
              />
            ) : null)}
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-8">
              <div ref={placeholderRef} className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-8 text-center min-h-[400px] flex flex-col items-center justify-center transition-opacity duration-500">
                <div className="h-16 w-16 rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
                </div>
                <h3 className="text-lg font-medium text-white/80 mb-2">Your Recommendation</h3>
                <p className="text-sm text-white/50">Complete the quiz to discover your perfect video style</p>
              </div>

              <div ref={cardRef} className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur overflow-hidden opacity-0 transition-opacity duration-500" style={{ display: 'none' }}>
                <div className="aspect-video relative overflow-hidden bg-black">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                      <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-fuchsia-500 animate-spin mb-4" />
                      <p className="text-sm font-medium text-white/90 animate-pulse">{LOADING_STEPS[Math.min(loadingStep, LOADING_STEPS.length - 1)]}</p>
                    </div>
                  ) : videoUrl ? (
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white/50">Video Unavailable</div>
                    </div>
                  )}
                  {/* Veo 3 Badge */}
                  {!isGenerating && videoUrl && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 z-10">
                      {/* Google Logo minimal */}
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.107-2.107 2.773-5.227 2.773-7.76 0-.773-.08-1.52-.213-2.227h-10.613z" /></svg>
                      <span className="text-[10px] font-medium text-white/90 tracking-wide">Veo 3</span>
                    </div>
                  )}
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recommendation?.styleTags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/10 text-white/70 border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/20 backdrop-blur mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Our Recommendation
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-2">{recommendation?.title}</h3>
                  <p className="text-base text-white/70 font-medium mb-3">{recommendation?.subtitle}</p>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">{recommendation?.description}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={showContactForm}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3 text-sm font-medium text-white shadow-lg hover:brightness-110 transition"
                    >
                      <span>Start This Project</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium bg-white/5 ring-1 ring-white/10 text-white/90 hover:bg-white/10 transition"
                      onClick={() => {
                        // Show placeholder again and hide card
                        if (placeholderRef.current) {
                          placeholderRef.current.style.display = 'block';
                          requestAnimationFrame(() => {
                            if (placeholderRef.current) placeholderRef.current.style.opacity = '1';
                          });
                        }
                        if (cardRef.current) {
                          cardRef.current.style.opacity = '0';
                          setTimeout(() => {
                            if (cardRef.current) cardRef.current.style.display = 'none';
                          }, 300);
                        }
                        reset();
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><path d="M21 3v9h-9" /></svg>
                      Retake Quiz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function labelFor(key: keyof ReturnType<typeof useQuiz>["selections"], opt: string) {
  if (key === 'duration') {
    if (opt === 'Reels') return 'Reels (<1 min)';
    if (opt === 'Explainer') return 'Explainer (1–2 min)';
    if (opt === 'Demo') return 'Demo (2–5 min)';
  }
  return opt;
}

function iconFor(key: keyof ReturnType<typeof useQuiz>["selections"], opt: string) {
  const commonProps = { xmlns: "http://www.w3.org/2000/svg", width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

  if (key === 'niche') {
    if (opt === 'Tech') return (<svg {...commonProps}><rect x="3" y="4" width="7" height="16" rx="1"></rect><rect x="14" y="4" width="7" height="16" rx="1"></rect></svg>);
    if (opt === 'Healthcare') return (<svg {...commonProps}><path d="M12 20s8-4.5 8-10a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 5.5 10 10 10 10"></path></svg>);
    if (opt === 'Retail') return (<svg {...commonProps}><path d="M20 7H4l2 14h12z"></path><path d="M9 7V3h6v4"></path></svg>);
    if (opt === 'Real Estate') return (<svg {...commonProps}><path d="M3 11l9-7 9 7"></path><path d="M9 22V12h6v10"></path></svg>);
    if (opt === 'Education') return (<svg {...commonProps}><path d="M22 10L12 4 2 10l10 6 10-6z"></path><path d="M6 12v5a6 3 0 0 0 12 0v-5"></path></svg>);
    return (<svg {...commonProps}><path d="M12 3v3"></path><path d="M12 18v3"></path><path d="M3 12h3"></path><path d="M18 12h3"></path><path d="M4.2 4.2l2.1 2.1"></path><path d="M17.7 17.7l2.1 2.1"></path><path d="M19.8 4.2l-2.1 2.1"></path><path d="M6.3 17.7l-2.1 2.1"></path></svg>);
  }

  if (key === 'audience') {
    if (opt === 'Consumers') return (<svg {...commonProps}><path d="M16 21v-2a4 4 0 0 0-8 0v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
    if (opt === 'Businesses') return (<svg {...commonProps}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>);
    if (opt === 'Investors') return (<svg {...commonProps}><path d="M3 3v18h18"></path><path d="M7 15l4-4 4 4 5-6"></path></svg>);
    if (opt === 'Employees') return (<svg {...commonProps}><path d="M16 21v-2a4 4 0 0 0-8 0v2"></path><circle cx="9" cy="7" r="3"></circle><circle cx="15" cy="7" r="3"></circle></svg>);
    if (opt === 'Students') return (<svg {...commonProps}><path d="M22 10L12 4 2 10l10 6 10-6z"></path><path d="M12 22v-6"></path></svg>);
  }

  if (key === 'style') {
    if (opt === 'Live Action') return (<svg {...commonProps}><rect x="2" y="7" width="15" height="10" rx="2"></rect><path d="M17 9l5-3v12l-5-3z"></path></svg>);
    if (opt === 'Animation') return (<svg {...commonProps}><path d="M12 3l2 4 4 .5-3 3 .7 4.5-3.7-2-3.7 2 .7-4.5-3-3 4-.5z"></path></svg>);
    if (opt === 'Mixed Media') return (<svg {...commonProps}><rect x="3" y="3" width="8" height="8" rx="1"></rect><rect x="13" y="13" width="8" height="8" rx="1"></rect><path d="M13 3h8v8"></path></svg>);
    if (opt === 'Motion Graphics') return (<svg {...commonProps}><path d="M3 12h18"></path><path d="M7 12v6"></path><path d="M12 12v8"></path><path d="M17 12v4"></path></svg>);
    if (opt === 'Minimal Explainer') return (<svg {...commonProps}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5a3.5 3.5 0 1 1 5 3.1V15"></path><path d="M12 18h.01"></path></svg>);
  }

  if (key === 'mood') {
    if (opt === 'Emotional') return (<svg {...commonProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>);
    if (opt === 'Playful') return (<svg {...commonProps}><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>);
    if (opt === 'Inspirational') return (<svg {...commonProps}><path d="M12 2v6"></path><path d="M5.2 6.2l4.2 4.2"></path><path d="M18.8 6.2l-4.2 4.2"></path><circle cx="12" cy="14" r="6"></circle></svg>);
    if (opt === 'Corporate') return (<svg {...commonProps}><rect x="3" y="7" width="18" height="12" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path></svg>);
    if (opt === 'Bold') return (<svg {...commonProps}><path d="M13 2l-2 20"></path><path d="M19 7l-6 6"></path><path d="M5 11l6 2"></path></svg>);
  }

  if (key === 'duration') {
    if (opt === 'Reels') return (<svg {...commonProps}><rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path></svg>);
    if (opt === 'Explainer') return (<svg {...commonProps}><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 9h10"></path><path d="M7 13h6"></path></svg>);
    if (opt === 'Demo') return (<svg {...commonProps}><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M7 20h10"></path></svg>);
    if (opt === 'Any') return (<svg {...commonProps}><path d="M5 12a7 7 0 1 0 7-7"></path><path d="M12 5v7h5"></path></svg>);
  }

  return (<svg {...commonProps}><circle cx="12" cy="12" r="9"></circle></svg>);
}
