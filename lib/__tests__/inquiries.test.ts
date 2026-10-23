import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInquiry } from '../inquiries';

test('quiz submission sends its selections to the inquiry API', async () => {
  const originalFetch = globalThis.fetch;
  let submitted: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    submitted = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ id: 'inquiry-1', inquiry_number: 'INQ-2026-001' }), { status: 201 });
  };

  try {
    const quizAnswers = {
      niche: 'Tech', audience: 'Businesses', style: 'Animation', mood: 'Bold', duration: 'Explainer',
    };
    await createInquiry({
      quizAnswers,
      contactInfo: { contactName: 'Quiz client', contactEmail: 'QUIZ@example.test', projectNotes: 'Animated product launch video' },
      recommendedVideoType: 'Animated Explainer',
    });
    assert.deepEqual(submitted?.quizAnswers, quizAnswers);
    assert.equal(submitted?.email, 'quiz@example.test');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
