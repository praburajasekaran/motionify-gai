'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/vitals';

export default function WebVitals() {
  useEffect(() => {
    initWebVitals();
  }, []);

  return null;
}
