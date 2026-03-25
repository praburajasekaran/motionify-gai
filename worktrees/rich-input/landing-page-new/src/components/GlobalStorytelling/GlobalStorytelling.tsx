"use client";

import { useEffect, useId } from "react";
import { useWorldMap } from "./useWorldMap";

export default function GlobalStorytelling() {
  const id = useId();
  const svgId = `world-map-${id}`;
  const containerId = `global-map-container-${id}`;

  useWorldMap(`#${svgId}`, `#${containerId}`);

  useEffect(() => {}, []);

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,27,75,1) 25%, rgba(49,46,129,1) 50%, rgba(30,27,75,1) 75%, rgba(15,23,42,1) 100%)",
        }} />
        <div className="absolute inset-0 opacity-40" style={{
          background: "radial-gradient(1200px 800px at 30% 30%, rgba(139,92,246,.25), transparent 60%), radial-gradient(1000px 900px at 70% 50%, rgba(192,132,252,.20), transparent 60%), radial-gradient(900px 700px at 50% 80%, rgba(245,158,11,.15), transparent 60%)",
          animation: 'panGradient 25s ease-in-out infinite'
        }} />
        <div className="absolute inset-0 opacity-10 globe-grid" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/80 ring-1 ring-white/10 backdrop-blur mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Global Team, Local Expertise
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">Stories that Speak Every Language.</h2>
          <p className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-3xl mx-auto">
            Our distributed team of experts brings stories to life — from every corner of the world.
          </p>

          {/* Team roles showcase */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-3 group">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 ring-2 ring-violet-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </div>
              <span className="text-sm font-medium text-white/90">Creative Writers</span>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 ring-2 ring-blue-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <span className="text-sm font-medium text-white/90">Animators</span>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
              </div>
              <span className="text-sm font-medium text-white/90">Designers</span>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 ring-2 ring-orange-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>
              </div>
              <span className="text-sm font-medium text-white/90">Illustrators</span>
            </div>

            <div className="flex flex-col items-center gap-3 group">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 ring-2 ring-pink-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
              </div>
              <span className="text-sm font-medium text-white/90">Directors</span>
            </div>
          </div>
        </div>

        <div className="relative mb-16 sm:mb-20">
          <div id={containerId} className="global-map-container relative rounded-3xl bg-slate-900/40 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden" style={{ minHeight: 500 }}>
            <svg id={svgId} width="100%" height="500" className="w-full" />
            <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/10 via-violet-600/10 to-cyan-500/10 blur-3xl -z-10 opacity-60" />
          </div>
          <svg className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen', opacity: .4 }}>
            <defs>
              <linearGradient id="auroraGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'rgba(6,182,212,0)', stopOpacity: 0 }} />
                <stop offset="50%" style={{ stopColor: 'rgba(6,182,212,0.8)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgba(139,92,246,0)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </section>
  );
}





