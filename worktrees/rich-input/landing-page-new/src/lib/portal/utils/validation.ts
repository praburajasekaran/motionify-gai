/**
 * Type guards and validation utilities for localStorage data
 * Fixes Bug #5: localStorage Type Validation Missing
 */

import { User, UserRole } from '../types';

/**
 * Type guard to validate User object
 */
export function isValidUser(obj: unknown): obj is User {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const user = obj as Record<string, unknown>;

  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    Object.values(UserRole).includes(user.role as UserRole) &&
    (user.hasAgreed === undefined || typeof user.hasAgreed === 'boolean')
  );
}

/**
 * Safely parse and validate localStorage data
 * Returns parsed and validated data, or null if invalid
 */
export function parseAndValidateUser(jsonString: string): User | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (isValidUser(parsed)) {
      return parsed;
    }

    console.warn('Invalid user data in localStorage, clearing...');
    return null;
  } catch (error) {
    console.error('Failed to parse localStorage data:', error);
    return null;
  }
}

/**
 * Safely get and validate data from localStorage
 */
export function getValidatedLocalStorageItem<T>(
  key: string,
  validator: (obj: unknown) => obj is T
): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const item = localStorage.getItem(key);
  if (!item) {
    return null;
  }

  try {
    const parsed = JSON.parse(item);
    return validator(parsed) ? parsed : null;
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}":`, error);
    // Clear corrupted data
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Safely set data in localStorage with error handling
 */
export function setLocalStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 */
export function removeLocalStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Email validation
 * Fixes Bug #13: No Email Validation
 */
export function isValidEmail(email: string): boolean {
  // RFC 5322 compliant email regex (simplified version)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate email with detailed error message
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, error: 'Email address is required' };
  }

  if (!isValidEmail(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}
