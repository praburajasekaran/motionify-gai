export default function ProcessTimeline() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18) 40%, rgba(236,72,153,0.18))", animation: 'panGradient 22s ease-in-out infinite' }} />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(99,102,241,0.06) 0px, rgba(99,102,241,0.06) 2px, transparent 2px, transparent 12px)" }} />
        {/* Colorful orbs for visual interest */}
        <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-violet-500 to-purple-600" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-fuchsia-500 to-pink-600" />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-4 py-1.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30 backdrop-blur mb-4">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 animate-pulse" />
              Your Journey with Motionify
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">From Idea to Impact</h2>
            <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">Every frame, every milestone — crafted with clarity, creativity, and care.</p>
          </div>

          {/* Vertical Timeline Diagram - Simplified Layout */}
          <div className="relative max-w-5xl mx-auto">
            {/* Animated gradient timeline line */}
            <div className="absolute left-6 sm:left-12 top-0 bottom-0 w-1 overflow-hidden rounded-full">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, #d946ef 0%, #a855f7 25%, #3b82f6 50%, #06b6d4 75%, #14b8a6 100%)',
                }}
              />
              {/* Animated glow effect */}
              <div
                className="absolute inset-0 rounded-full opacity-60"
                style={{
                  background: 'linear-gradient(to bottom, #d946ef 0%, #a855f7 25%, #3b82f6 50%, #06b6d4 75%, #14b8a6 100%)',
                  filter: 'blur(4px)',
                  animation: 'pulse 3s ease-in-out infinite',
                }}
              />
            </div>

            {/* Timeline steps - Simplified horizontal layout */}
            <div className="space-y-6 sm:space-y-8">
              {processSteps.map((s, idx) => (
                <div key={s.title} className="relative group">
                  {/* Single row: Marker + Icon + Content */}
                  <div className={`flex items-center gap-4 sm:gap-6 rounded-3xl ${s.cardBg} ring-1 ${s.cardRing} backdrop-blur p-5 sm:p-7 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ml-16 sm:ml-24`}>
                    {/* Icon */}
                    <div className={`flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl ${s.iconBg} ring-1 ${s.iconRing} backdrop-blur flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`} dangerouslySetInnerHTML={{ __html: s.icon }} />

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 text-white">{s.title}</h3>
                      <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>

                  {/* Timeline marker (numbered circle) - absolute positioned */}
                  <div className="absolute left-0 sm:left-6 top-1/2 -translate-y-1/2">
                    <div className={`relative z-10 h-12 w-12 sm:h-14 sm:w-14 rounded-full ${s.badgeBg} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-xl ring-4 ${s.ringColor} transition-transform duration-300 group-hover:scale-110`}>
                      <span>{idx + 1}</span>
                      {/* Pulse effect on hover */}
                      <div className={`absolute inset-0 rounded-full ${s.badgeBg} blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
                    </div>
                  </div>

                  {/* Connecting line from marker to card */}
                  <div className="absolute left-12 sm:left-20 top-1/2 -translate-y-1/2 w-4 sm:w-4 h-0.5" style={{ background: `linear-gradient(to right, ${s.badgeBg.includes('fuchsia') ? '#d946ef' : s.badgeBg.includes('violet') ? '#a855f7' : s.badgeBg.includes('blue') && s.badgeBg.includes('cyan') ? '#3b82f6' : s.badgeBg.includes('cyan') ? '#06b6d4' : '#14b8a6'}, transparent)`, opacity: 0.6 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 italic">Your complete journey — from concept to delivery</p>
          </div>

        </div>
      </div>
    </section>
  );
}

const processSteps = [
  {
    title: 'Choose & Customize',
    desc: 'Pick your video style and tailor it to your brand.',
    badgeBg: 'bg-gradient-to-br from-fuchsia-500 to-violet-600',
    ringColor: 'ring-fuchsia-900',
    cardBg: 'bg-gradient-to-br from-fuchsia-950/70 to-violet-950/70',
    cardRing: 'ring-fuchsia-700/30',
    hoverRing: 'ring-fuchsia-500',
    iconBg: 'bg-fuchsia-900/50',
    iconRing: 'ring-fuchsia-700/50',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-fuchsia-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>`
  },
  {
    title: 'Submit Your Brief',
    desc: 'Share goals, tone, and creative direction.',
    badgeBg: 'bg-gradient-to-br from-violet-500 to-blue-600',
    ringColor: 'ring-violet-900',
    cardBg: 'bg-gradient-to-br from-violet-950/70 to-blue-950/70',
    cardRing: 'ring-violet-700/30',
    hoverRing: 'ring-violet-500',
    iconBg: 'bg-violet-900/50',
    iconRing: 'ring-violet-700/50',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-violet-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" x2="8" y1="13" y2="13"></line><line x1="16" x2="8" y1="17" y2="17"></line><line x1="10" x2="8" y1="9" y2="9"></line></svg>`
  },
  {
    title: 'Add-Ons',
    desc: 'Scriptwriting, multilingual voiceovers, localization, subtitles.',
    badgeBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    ringColor: 'ring-blue-900',
    cardBg: 'bg-gradient-to-br from-blue-950/70 to-cyan-950/70',
    cardRing: 'ring-blue-700/30',
    hoverRing: 'ring-blue-500',
    iconBg: 'bg-blue-900/50',
    iconRing: 'ring-blue-700/50',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M12 5v14"></path><path d="M5 12h14"></path><circle cx="12" cy="12" r="10"></circle></svg>`
  },
  {
    title: 'Track Progress',
    desc: 'Access milestones, previews, and feedback loops.',
    badgeBg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
    ringColor: 'ring-cyan-900',
    cardBg: 'bg-gradient-to-br from-cyan-950/70 to-teal-950/70',
    cardRing: 'ring-cyan-700/30',
    hoverRing: 'ring-cyan-500',
    iconBg: 'bg-cyan-900/50',
    iconRing: 'ring-cyan-700/50',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`
  },
  {
    title: 'Download & Shine',
    desc: 'Get final assets ready for every platform.',
    badgeBg: 'bg-gradient-to-br from-teal-500 to-emerald-600',
    ringColor: 'ring-teal-900',
    cardBg: 'bg-gradient-to-br from-teal-950/70 to-emerald-950/70',
    cardRing: 'ring-teal-700/30',
    hoverRing: 'ring-teal-500',
    iconBg: 'bg-teal-900/50',
    iconRing: 'ring-teal-700/50',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-teal-400"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>`
  },
];
