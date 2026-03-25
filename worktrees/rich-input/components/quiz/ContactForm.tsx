"use client";

import React, { useState } from 'react';
import { Mail, User, Building2, Phone, FileText } from 'lucide-react';
import { isValidEmail, isValidPhone, type ContactInfo } from '../../lib/inquiries';

interface ContactFormProps {
  onSubmit: (contactInfo: ContactInfo) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function ContactForm({ onSubmit, onBack, isSubmitting = false }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactInfo>({
    contactName: '',
    contactEmail: '',
    companyName: '',
    contactPhone: '',
    projectNotes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ContactInfo, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactInfo, boolean>>>({});

  const handleChange = (field: keyof ContactInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof ContactInfo) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: keyof ContactInfo): boolean => {
    const value = formData[field];

    if (field === 'contactName') {
      if (!value || value.trim() === '') {
        setErrors(prev => ({ ...prev, [field]: 'Name is required' }));
        return false;
      }
      if (value.trim().length < 2) {
        setErrors(prev => ({ ...prev, [field]: 'Name must be at least 2 characters' }));
        return false;
      }
    }

    if (field === 'contactEmail') {
      if (!value || value.trim() === '') {
        setErrors(prev => ({ ...prev, [field]: 'Email is required' }));
        return false;
      }
      if (!isValidEmail(value)) {
        setErrors(prev => ({ ...prev, [field]: 'Invalid email format' }));
        return false;
      }
    }

    if (field === 'contactPhone' && value && value.trim() !== '') {
      if (!isValidPhone(value)) {
        setErrors(prev => ({ ...prev, [field]: 'Invalid phone number' }));
        return false;
      }
    }

    setErrors(prev => ({ ...prev, [field]: undefined }));
    return true;
  };

  const validateForm = (): boolean => {
    const nameValid = validateField('contactName');
    const emailValid = validateField('contactEmail');
    const phoneValid = formData.contactPhone ? validateField('contactPhone') : true;

    return nameValid && emailValid && phoneValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all required fields as touched
    setTouched({
      contactName: true,
      contactEmail: true,
      contactPhone: !!formData.contactPhone,
    });

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const isFormValid = formData.contactName.trim() !== '' &&
    formData.contactEmail.trim() !== '' &&
    !Object.values(errors).some(error => error);

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-6 sm:p-8">
      {/* Back button */}
      <div className="mb-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 ring-1 ring-white/10 text-white/80 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-80"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
      </div>

      {/* Header */}
      <h3 className="text-2xl sm:text-3xl font-semibold mb-2">Almost There!</h3>
      <p className="text-white/60 text-sm mb-6">
        Help us get in touch with you about your video project
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-white/90 mb-2">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              <User size={18} />
            </div>
            <input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              onBlur={() => handleBlur('contactName')}
              disabled={isSubmitting}
              placeholder="John Doe"
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${touched.contactName && errors.contactName
                  ? 'border-red-400/50 focus:ring-red-400/50'
                  : 'border-white/10 focus:ring-violet-400/50'
                }`}
            />
          </div>
          {touched.contactName && errors.contactName && (
            <p className="text-xs text-red-400 mt-1">{errors.contactName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-white/90 mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              <Mail size={18} />
            </div>
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              onBlur={() => handleBlur('contactEmail')}
              disabled={isSubmitting}
              placeholder="john@example.com"
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${touched.contactEmail && errors.contactEmail
                  ? 'border-red-400/50 focus:ring-red-400/50'
                  : 'border-white/10 focus:ring-violet-400/50'
                }`}
            />
          </div>
          {touched.contactEmail && errors.contactEmail && (
            <p className="text-xs text-red-400 mt-1">{errors.contactEmail}</p>
          )}
        </div>

        {/* Company (Optional) */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-white/90 mb-2">
            Company Name <span className="text-white/40 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              <Building2 size={18} />
            </div>
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              disabled={isSubmitting}
              placeholder="Acme Inc."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Phone (Optional) */}
        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-white/90 mb-2">
            Phone Number <span className="text-white/40 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              <Phone size={18} />
            </div>
            <input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              onBlur={() => handleBlur('contactPhone')}
              disabled={isSubmitting}
              placeholder="+1 (555) 123-4567"
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${touched.contactPhone && errors.contactPhone
                  ? 'border-red-400/50 focus:ring-red-400/50'
                  : 'border-white/10 focus:ring-violet-400/50'
                }`}
            />
          </div>
          {touched.contactPhone && errors.contactPhone && (
            <p className="text-xs text-red-400 mt-1">{errors.contactPhone}</p>
          )}
        </div>

        {/* Project Notes (Optional) */}
        <div>
          <label htmlFor="projectNotes" className="block text-sm font-medium text-white/90 mb-2">
            Tell us more about your project <span className="text-white/40 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3 text-white/40">
              <FileText size={18} />
            </div>
            <textarea
              id="projectNotes"
              value={formData.projectNotes}
              onChange={(e) => handleChange('projectNotes', e.target.value)}
              disabled={isSubmitting}
              placeholder="Share any additional details about your video needs, goals, or timeline..."
              rows={4}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400/50 transition resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {formData.projectNotes && (
            <p className="text-xs text-white/40 mt-1">
              {formData.projectNotes.length} / 2000 characters
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3.5 text-base font-medium text-white shadow-lg hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Send Me a Proposal</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-white/40 text-center pt-2">
          We respect your privacy. Your information will only be used to send you a personalized proposal.
        </p>
      </form>
    </div>
  );
}
