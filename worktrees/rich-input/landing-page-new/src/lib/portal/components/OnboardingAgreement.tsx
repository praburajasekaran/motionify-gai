'use client';

import React, { useState, useContext } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import Card from './ui/Card';
import Button from './ui/Button';

interface OnboardingAgreementProps {
  onAgree: () => void;
}

const OnboardingAgreement = ({ onAgree }: OnboardingAgreementProps) => {
  const { project } = useContext(AppContext);
  const [hasAgreed, setHasAgreed] = useState(false);

  // FIX: Add null check for project to prevent runtime errors.
  if (!project) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <Card title={`Welcome to the ${project.name} Portal!`}>
        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          <p>
            Before we begin, please review and agree to the project scope and terms outlined below.
          </p>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Project Scope</h4>
            <div className="space-y-3 text-sm">
                <div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200">Deliverables:</h5>
                  <div className="space-y-2 mt-2">
                    {project.scope.deliverables.map((item) => (
                      <div key={item.id} className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-500 mr-2.5 mt-0.5 flex-shrink-0">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {project.scope.nonInclusions.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200">The following are not included:</h5>
                    <div className="space-y-2 mt-2">
                      {project.scope.nonInclusions.map((item, index) => (
                        <div key={index} className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500 mr-2.5 mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                          <span className="text-gray-600 dark:text-gray-400">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Revisions</h4>
            <p className="text-sm">
              This project includes a total of <strong>{project.totalRevisions} rounds of revisions</strong>. Additional revisions may be subject to further charges.
            </p>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="agreement"
                name="agreement"
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="agreement" className="font-medium text-gray-700 dark:text-gray-200">
                I have read, understood, and agree to the project scope and revision terms.
              </label>
            </div>
          </div>
          <div className="text-right">
            <Button onClick={onAgree} disabled={!hasAgreed}>
              Agree & Continue to Portal
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingAgreement;

