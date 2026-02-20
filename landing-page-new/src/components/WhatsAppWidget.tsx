"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

// TODO: Replace with real WhatsApp number (country code + number, no + or spaces)
const WHATSAPP_NUMBER = "919999999999";

type QuizSelections = {
  niche: string | null;
  audience: string | null;
  style: string | null;
  mood: string | null;
  duration: string | null;
};

function buildMessage(quiz: QuizSelections | null): string {
  if (!quiz || !quiz.niche) {
    return "Hi! I'm interested in video production services from Motionify. Can we discuss my project?";
  }

  const lines = [
    "Hi! I'm interested in video production from Motionify.",
    "",
    "Here are my preferences from the quiz:",
    quiz.niche ? `• Niche: ${quiz.niche}` : null,
    quiz.audience ? `• Audience: ${quiz.audience}` : null,
    quiz.style ? `• Style: ${quiz.style}` : null,
    quiz.mood ? `• Mood: ${quiz.mood}` : null,
    quiz.duration ? `• Duration: ${quiz.duration}` : null,
    "",
    "I'd love to discuss my project!",
  ].filter((l) => l !== null) as string[];

  return lines.join("\n");
}

export default function WhatsAppWidget() {
  const [waUrl, setWaUrl] = useState<string>("");

  useEffect(() => {
    let quiz: QuizSelections | null = null;
    try {
      const stored = localStorage.getItem("motionify_quiz_responses");
      if (stored) quiz = JSON.parse(stored);
    } catch {
      // ignore parse errors
    }
    const message = buildMessage(quiz);
    setWaUrl(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
  }, []);

  if (!waUrl) return null;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400/40"
      style={{ backgroundColor: "#25D366" }}
    >
      <MessageCircle size={26} strokeWidth={1.75} className="text-white" fill="white" />
    </a>
  );
}
