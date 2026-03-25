'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
              src="/images/motionify-light-logo.png"
              alt="Motionify.Studio"
              width={120}
              height={36}
              className={`w-auto transition-all duration-300 group-hover:opacity-90 ${isScrolled ? 'h-7 sm:h-8' : 'h-8 sm:h-9'
                }`}
              priority
            />
          </Link>
          <div className="hidden sm:flex items-center gap-8">
            <Link href="/work" className="text-sm text-white/80 hover:text-white transition">Work</Link>
            <Link href="/work#approach" className="text-sm text-white/80 hover:text-white transition">Approach</Link>

            {!isLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/80">Welcome, {user.fullName}</span>
                    <button
                      onClick={() => router.push('/portal/dashboard')}
                      className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'}`}
                    >
                      Dashboard
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link href="/login" className={`inline-flex items-center gap-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" x2="3" y1="12" y2="12"></line></svg>
                      Login
                    </Link>
                    <a href="/#video-style-quiz" className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'}`}>
                      Get Started
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </a>
                  </>
                )}
              </>
            )}
          </div>
          <button
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden inline-flex items-center bg-gradient-to-r from-violet-600 to-blue-600 text-white px-2.5 py-2 rounded-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 transition"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-gray-950 border-t border-white/10 px-4 pb-4">
          <nav className="flex flex-col gap-2 py-3">
            <Link href="/work" onClick={() => setIsMenuOpen(false)} className="text-sm text-white/80 hover:text-white transition py-2 px-3 rounded-lg hover:bg-white/5">Work</Link>
            <Link href="/work#approach" onClick={() => setIsMenuOpen(false)} className="text-sm text-white/80 hover:text-white transition py-2 px-3 rounded-lg hover:bg-white/5">Approach</Link>
          </nav>
          {!isLoading && (
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              {user ? (
                <>
                  <span className="text-sm text-white/80 px-3 py-1">Welcome, {user.fullName}</span>
                  <button
                    onClick={() => { setIsMenuOpen(false); router.push('/portal/dashboard'); }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 px-4 py-2.5 text-sm"
                  >
                    Dashboard
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30 px-4 py-2.5 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" x2="3" y1="12" y2="12"></line></svg>
                    Login
                  </Link>
                  <a href="/#video-style-quiz" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 px-4 py-2.5 text-sm">
                    Get Started
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}


