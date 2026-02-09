"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { requestInquiryVerification, type ContactInfo, type Inquiry } from "../../lib/inquiries";

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
  const [current, setCurrent] = useState<number>(-1); // -1 = welcome, 0-4 = quiz, 5 = contact, 6 = success/verify
  const [selections, setSelections] = useState<QuizSelections>(INITIAL);
  const [submittedInquiry, setSubmittedInquiry] = useState<Inquiry | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const total = 5; // Number of quiz questions (doesn't include contact form or success)

  // Store last submission data for resend functionality
  const lastSubmissionRef = useRef<{
    contactInfo: ContactInfo;
    recommendedVideoType: string;
  } | null>(null);

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
    setVerificationSent(false);
    setContactEmail(null);
    setMagicLink(null);
    lastSubmissionRef.current = null;
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

  const submitInquiry = useCallback(async (contactInfo: ContactInfo, recommendedVideoType: string) => {
    try {
      const result = await requestInquiryVerification({
        quizAnswers: selections,
        contactInfo,
        recommendedVideoType,
      });

      // Store for potential resend
      lastSubmissionRef.current = { contactInfo, recommendedVideoType };

      setContactEmail(contactInfo.contactEmail);
      setMagicLink(result.magicLink || null);
      setVerificationSent(true);
      setCurrent(6);
    } catch (error) {
      console.error('Error requesting inquiry verification:', error);
      throw error;
    }
  }, [selections]);

  const resendVerification = useCallback(async (): Promise<{ success: boolean; magicLink?: string }> => {
    if (!lastSubmissionRef.current) {
      return { success: false };
    }

    try {
      const result = await requestInquiryVerification({
        quizAnswers: selections,
        contactInfo: lastSubmissionRef.current.contactInfo,
        recommendedVideoType: lastSubmissionRef.current.recommendedVideoType,
      });

      if (result.magicLink) {
        setMagicLink(result.magicLink);
      }

      return { success: true, magicLink: result.magicLink };
    } catch (error) {
      console.error('Error resending verification:', error);
      return { success: false };
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
    verificationSent,
    contactEmail,
    magicLink,
    resendVerification,
  };
}

