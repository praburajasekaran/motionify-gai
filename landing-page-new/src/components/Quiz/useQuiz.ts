"use client";

import { useCallback, useMemo, useState } from "react";
import { createInquiry, type ContactInfo, type Inquiry } from "../../lib/inquiries";

export type QuizSelections = {
  niche: string | null;
  audience: string | null;
  style: string | null;
  mood: string | null;
  duration: string | null;
};

export type Recommendation = {
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
};

const INITIAL: QuizSelections = {
  niche: null,
  audience: null,
  style: null,
  mood: null,
  duration: null,
};

export function useQuiz() {
  const [current, setCurrent] = useState<number>(-1); // -1 = welcome, 0-4 = quiz, 5 = contact, 6 = success
  const [selections, setSelections] = useState<QuizSelections>(INITIAL);
  const [submittedInquiry, setSubmittedInquiry] = useState<Inquiry | null>(null);
  const total = 5; // Number of quiz questions (doesn't include contact form or success)

  const startQuiz = useCallback(() => {
    setCurrent(0);
  }, []);

  const select = useCallback((key: keyof QuizSelections, value: string) => {
    setSelections((s) => ({ ...s, [key]: value }));
    setCurrent((c) => Math.min(c + 1, total - 1));
  }, []);

  const goBack = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, -1));
  }, []);

  const reset = useCallback(() => {
    setSelections(INITIAL);
    setSubmittedInquiry(null);
    setCurrent(-1);
  }, []);

  const isComplete = useMemo(
    () => Object.values(selections).every((v) => v !== null),
    [selections]
  );

  const isWelcomeScreen = useMemo(() => current === -1, [current]);
  const isContactForm = useMemo(() => current === 5, [current]);
  const isSuccessScreen = useMemo(() => current === 6, [current]);

  // New function to handle showing contact form
  const showContactForm = useCallback(() => {
    setCurrent(5);
  }, []);

  // New function to handle inquiry submission
  const submitInquiry = useCallback((contactInfo: ContactInfo, recommendedVideoType: string) => {
    try {
      const inquiry = createInquiry({
        quizAnswers: selections,
        contactInfo,
        recommendedVideoType,
      });

      setSubmittedInquiry(inquiry);
      setCurrent(6); // Move to success screen
      return inquiry;
    } catch (error) {
      console.error('Error creating inquiry:', error);
      throw error;
    }
  }, [selections]);

  return {
    current,
    total,
    selections,
    select,
    setCurrent,
    goBack,
    reset,
    isComplete,
    startQuiz,
    isWelcomeScreen,
    isContactForm,
    isSuccessScreen,
    showContactForm,
    submitInquiry,
    submittedInquiry,
  };
}





