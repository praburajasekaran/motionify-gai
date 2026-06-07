import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TAWK_SCRIPT_ID = 'tawk-to-script';
const TAWK_SCRIPT_SRC = 'https://embed.tawk.to/6a24f7a06d77da1c401dea56/1jqg6ejm4';
const MARKETING_PATHS = new Set(['/', '/about', '/contact', '/work']);

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      onLoad?: () => void;
      [key: string]: unknown;
    };
    Tawk_LoadStart?: Date;
  }
}

export default function TawkChat() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isMarketingPath = MARKETING_PATHS.has(pathname);

    if (!isMarketingPath) {
      window.Tawk_API?.hideWidget?.();
      return;
    }

    window.Tawk_API?.showWidget?.();
    if (document.getElementById(TAWK_SCRIPT_ID)) return;
    if (document.querySelector(`script[src="${TAWK_SCRIPT_SRC}"]`)) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_API.onLoad = () => {
      if (!MARKETING_PATHS.has(window.location.pathname)) {
        window.Tawk_API?.hideWidget?.();
      }
    };
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.id = TAWK_SCRIPT_ID;
    script.async = true;
    script.src = TAWK_SCRIPT_SRC;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.body.appendChild(script);
  }, [pathname]);

  return null;
}
