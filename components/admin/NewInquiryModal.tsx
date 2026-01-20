import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { createInquiry, isValidEmail, isValidPhone, type ContactInfo } from '../../lib/inquiries';
import { QuizSelections } from '../quiz/useQuiz';
import { User as UserType } from '../../types';

interface NewInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserType | null;
}

const VIDEO_TYPES = [
  'Product Demo',
  'Brand Story',
  'Explainer Video',
  'Social Media Content',
  'Event Coverage',
  'Tutorial/Educational',
  'Testimonial',
  'Other',
];

const NICHES = [
  'Technology',
  'Healthcare',
  'Education',
  'E-commerce',
  'Real Estate',
  'Finance',
  'Entertainment',
  'Other',
];

export function NewInquiryModal({ isOpen, onClose, onSuccess, user }: NewInquiryModalProps) {
  const [formData, setFormData] = useState<ContactInfo & { videoType: string; niche: string }>({
    contactName: '',
    contactEmail: '',
    companyName: '',
    contactPhone: '',
    projectNotes: '',
    videoType: '',
    niche: '',
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      // Use user's name, or extract from email if name is not set
      const userName = user.name || (user.email ? user.email.split('@')[0] : '');
      setFormData(prev => ({
        ...prev,
        contactName: userName,
        contactEmail: user.email || '',
      }));
    }
  }, [isOpen, user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    // Contact info is automatically taken from logged-in user
    // Only validate project information fields

    if (!formData.videoType) {
      newErrors.videoType = 'Video type is required';
    }

    if (!formData.niche) {
      newErrors.niche = 'Industry/niche is required';
    }

    if (!formData.projectNotes?.trim()) {
      newErrors.projectNotes = 'Project description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const quizAnswers: QuizSelections = {
        niche: formData.niche,
        audience: 'General',
        style: 'Professional',
        mood: 'Informative',
        duration: 'Medium (1-3 min)',
      };

      const contactInfo: ContactInfo = {
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        companyName: formData.companyName || undefined,
        contactPhone: formData.contactPhone || undefined,
        projectNotes: formData.projectNotes,
      };

      await createInquiry({
        quizAnswers,
        contactInfo,
        recommendedVideoType: formData.videoType,
        clientUserId: user?.id,
      });

      setFormData({
        contactName: '',
        contactEmail: '',
        companyName: '',
        contactPhone: '',
        projectNotes: '',
        videoType: '',
        niche: '',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating inquiry:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        contactName: '',
        contactEmail: '',
        companyName: '',
        contactPhone: '',
        projectNotes: '',
        videoType: '',
        niche: '',
      });
      setErrors({});
      setSubmitError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Inquiry</h2>
            <p className="text-sm text-gray-600 mt-1">Submit a new project inquiry</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitError && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Creating Inquiry</h3>
                <p className="text-sm text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {user && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Creating inquiry for:</span> {user.name || user.email?.split('@')[0] || 'User'} ({user.email})
              </p>
            </div>
          )}



          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="videoType" className="block text-sm font-medium text-gray-700 mb-2">
                  Video Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="videoType"
                  value={formData.videoType}
                  onChange={(e) => handleChange('videoType', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900 focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${errors.videoType
                    ? 'border-red-300 focus:ring-red-500/50'
                    : 'border-gray-300 focus:ring-violet-500/50'
                    }`}
                >
                  <option value="">Select video type...</option>
                  {VIDEO_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.videoType && (
                  <p className="text-xs text-red-600 mt-1">{errors.videoType}</p>
                )}
              </div>

              <div>
                <label htmlFor="niche" className="block text-sm font-medium text-gray-700 mb-2">
                  Industry/Niche <span className="text-red-500">*</span>
                </label>
                <select
                  id="niche"
                  value={formData.niche}
                  onChange={(e) => handleChange('niche', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900 focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${errors.niche
                    ? 'border-red-300 focus:ring-red-500/50'
                    : 'border-gray-300 focus:ring-violet-500/50'
                    }`}
                >
                  <option value="">Select industry...</option>
                  {NICHES.map(niche => (
                    <option key={niche} value={niche}>{niche}</option>
                  ))}
                </select>
                {errors.niche && (
                  <p className="text-xs text-red-600 mt-1">{errors.niche}</p>
                )}
              </div>

              <div>
                <label htmlFor="projectNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    id="projectNotes"
                    value={formData.projectNotes}
                    onChange={(e) => handleChange('projectNotes', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Describe your video project, goals, timeline, and any specific requirements..."
                    rows={5}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition resize-none disabled:opacity-50 disabled:cursor-not-allowed ${errors.projectNotes
                      ? 'border-red-300 focus:ring-red-500/50'
                      : 'border-gray-300 focus:ring-violet-500/50'
                      }`}
                  />
                </div>
                {errors.projectNotes && (
                  <p className="text-xs text-red-600 mt-1">{errors.projectNotes}</p>
                )}
                {formData.projectNotes && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.projectNotes.length} characters
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Inquiry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
