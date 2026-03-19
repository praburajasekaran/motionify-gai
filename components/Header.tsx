'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-gray-950 transition-all duration-300 ${isScrolled ? 'border-b border-white/10' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'py-3' : 'py-5'}`}>
          <a href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/motionify-light-logo.png"
              alt="Motionify.Studio"
              className={`w-auto transition-all duration-300 group-hover:opacity-90 ${isScrolled ? 'h-7 sm:h-8' : 'h-8 sm:h-9'}`}
            />
          </a>
          <div className="hidden sm:flex items-center gap-8">
            <a href="/work" className="text-sm text-white/80 hover:text-white transition">Work</a>
            <a href="/about" className="text-sm text-white/80 hover:text-white transition">About</a>
            
            {!isLoading && (
              <>
                {user ? (
                  // Logged in state
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/80">Welcome, {user.name}</span>
                    <button
                      onClick={() => navigate('/dashboard')}
                      aria-label="Go to dashboard"
                      className={`inline-flex items-center gap-2 rounded-lg bg-[var(--studio-amber)] text-white font-medium hover:bg-[var(--studio-amber-hover)] transition-all duration-300 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'}`}
                    >
                      Dashboard
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                ) : (
                  // Not logged in state
                  <>
                    <a href="/login" className="text-sm text-white/80 hover:text-white transition">Login</a>
                    <a href="/contact" className={`inline-flex items-center gap-2 rounded-lg bg-[var(--studio-amber)] text-white font-medium hover:bg-[var(--studio-amber-hover)] transition-all duration-300 ${isScrolled ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'}`}>
                      Get in touch
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </a>
                  </>
                )}
              </>
            )}
          </div>
          <button aria-label="Open menu" className="sm:hidden inline-flex items-center bg-[var(--studio-amber)] text-white px-2.5 py-2 rounded-lg hover:bg-[var(--studio-amber-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
