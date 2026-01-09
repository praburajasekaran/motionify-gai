"use client";

import LoginScreen from '@/lib/portal/components/LoginScreen';

/**
 * Login Page - Uses Magic Link authentication
 * 
 * TC-AUTH-002: Unregistered email returns generic success (no enumeration)
 * TC-AUTH-003: Expired tokens show proper error
 * TC-AUTH-004: Already-used tokens show proper error
 */
export default function LoginPage() {
  return <LoginScreen />;
}
