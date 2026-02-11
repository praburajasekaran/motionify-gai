'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-gray-950 transition-all duration-300 ${isScrolled ? 'shadow-lg shadow-black/20' : ''
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'py-3' : 'py-5'
          }`}>
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Image
              src="/motionify-light-logo.png"
              alt="Motionify.Studio"
              width={120}
              height={36}
              className={`w-auto transition-all duration-300 group-hover:opacity-90 ${isScrolled ? 'h-7 sm:h-8' : 'h-8 sm:h-9'
                }`}
              priority
            />
          </Link>
          <div className="hidden sm:flex items-center gap-8">
            <a href="#" className="text-sm text-white/80 hover:text-white transition">Work</a>
            <a href="#" className="text-sm text-white/80 hover:text-white transition">Approach</a>
            <a href="#" className="text-sm text-white/80 hover:text-white transition">Pricing</a>
            <Link href="/login" className={`inline-flex items-center gap-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'
              }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" x2="3" y1="12" y2="12"></line></svg>
              Login
            </Link>
            <a href="#" className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'
              }`}>
              Get in touch
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </a>
          </div>
          <button aria-label="Open menu" className="sm:hidden inline-flex items-center bg-gradient-to-r from-violet-600 to-blue-600 text-white px-2.5 py-2 rounded-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
          </button>
        </div>
      </div>
    </header>
  );
}


