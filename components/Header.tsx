'use client';

import { useEffect, useState } from "react";
import { portalLoginPath, portalPath } from "@/lib/canonical-links";
import { landingButtonVariants } from "@/components/landing/LandingButton";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
              src="/images/motionify-studio-web.png"
              alt="Motionify Studio"
              className={`w-auto transition-all duration-300 group-hover:opacity-90 ${isScrolled ? 'h-10 sm:h-11' : 'h-12 sm:h-14'}`}
            />
          </a>
          <div className="hidden sm:flex items-center gap-8">
            <a href="/work" className="text-sm text-white/80 hover:text-white transition">Work</a>
            <a href="/about" className="text-sm text-white/80 hover:text-white transition">About</a>
            <a href={portalLoginPath()} className="text-sm text-white/80 hover:text-white transition">Login</a>
            <a href={portalPath()} className="text-sm text-white/80 hover:text-white transition">Portal</a>
            <a href="/contact" className={landingButtonVariants({ variant: "primaryOrange", size: isScrolled ? "sm" : "md" })}>
              Get in touch
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </a>
          </div>
          <button
            type="button"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className={landingButtonVariants({ variant: "primaryOrange", size: "iconSm", className: "sm:hidden" })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
          </button>
        </div>
        {isMenuOpen && (
          <nav className="sm:hidden border-t border-white/10 pb-4 pt-3">
            <div className="flex flex-col gap-1">
              <a href="/work" onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white">Work</a>
              <a href="/about" onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white">About</a>
              <a href={portalLoginPath()} onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white">Login</a>
              <a href={portalPath()} onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white">Portal</a>
              <a href="/contact" onClick={() => setIsMenuOpen(false)} className={landingButtonVariants({ variant: "primaryOrange", size: "md", className: "mt-2" })}>
                Get in touch
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
