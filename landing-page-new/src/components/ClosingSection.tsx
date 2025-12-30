export default function ClosingSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40 text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 20%,#581c87 45%,#7c2d82 70%,#8b4672 85%,#935e63 100%)' }} />
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(1400px 900px at 20% 30%, rgba(139,92,246,.3), transparent 70%), radial-gradient(1200px 1000px at 80% 70%, rgba(255,139,123,.25), transparent 70%), radial-gradient(1000px 800px at 50% 50%, rgba(168,85,247,.2), transparent 60%)', animation: 'panGradient 25s ease-in-out infinite' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/90 ring-1 ring-white/20 backdrop-blur-sm mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            The Motionify Difference
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            We Don't Just Make Videos —<br />
            <span className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">We Create Experiences.</span>
          </h2>
          <p className="text-xl sm:text-2xl text-white/80 max-w-3xl mx-auto font-medium">Trusted by global brands for creativity, reliability, and results.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {pillars.map((p) => (
            <div key={p.title} className="group relative bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-white/30 transition-all duration-500 hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl" style={{ background: p.overlay }} />
              <div className="relative">
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl mb-6 ring-1 ring-white/20 group-hover:ring-white/40 transition-all group-hover:scale-110 ${p.iconBg}`}>
                  {p.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">{p.title}</h3>
                <p className="text-base text-white/70 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        
      </div>
    </section>
  );
}

const pillars = [
  {
    title: 'End-to-End Video Solutions',
    desc: 'From concept to final cut, all under one roof.',
    iconBg: 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20',
    overlay: 'linear-gradient(to bottom right, rgba(128,0,128,0.1), transparent)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-300"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4Z"/></svg>
    )
  },
  {
    title: 'Creative & Strategic Expertise',
    desc: 'We merge emotion with business intent.',
    iconBg: 'bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20',
    overlay: 'linear-gradient(to bottom right, rgba(255,0,255,0.1), transparent)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-300"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
    )
  },
  {
    title: 'Data-Driven Recommendations',
    desc: 'Every story backed by insight and impact.',
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20',
    overlay: 'linear-gradient(to bottom right, rgba(0,0,255,0.1), transparent)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
    )
  },
  {
    title: 'Global Delivery, Local Insight',
    desc: 'Crafted for every market, from San Francisco to Singapore.',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
    overlay: 'linear-gradient(to bottom right, rgba(0,255,128,0.1), transparent)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    )
  },
  {
    title: 'Fast Turnaround, Flawless Quality',
    desc: 'Precision meets passion, on schedule.',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
    overlay: 'linear-gradient(to bottom right, rgba(255,165,0,0.1), transparent)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    )
  },
];





