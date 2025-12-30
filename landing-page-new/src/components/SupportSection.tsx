import Image from "next/image";

export default function SupportSection() {
  const team = [
    { name: 'Sarah Chen', role: 'Project Manager', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop', quote: '"Let\'s make this story shine."' },
    { name: 'Marcus Rivera', role: 'Creative Director', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', quote: '"Every frame tells your truth."' },
    { name: 'Aisha Patel', role: 'Support Specialist', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop', quote: '"We\'re here, every step of the way."' },
    { name: 'James Lee', role: 'Technical Lead', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop', quote: '"Quality is our love language."' },
  ];

  const highlights = [
    { title: 'Creative Consultation', desc: 'Get expert advice before you even start.' },
    { title: 'Project Guidance', desc: "We're with you through every frame." },
    { title: 'Instant Help', desc: 'Live chat and quick replies that feel personal.' },
  ];

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none -z-5" style={{ background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 30%, transparent 100%)' }} />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#F5F1ED 0%,#F8E8E0 25%,#F0E4F3 50%,#E8DDED 75%,#E5D9ED 100%)' }} />
        <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(1200px 800px at 30% 40%, rgba(255, 170, 136, 0.3), transparent 60%), radial-gradient(1000px 900px at 70% 60%, rgba(255, 139, 123, 0.25), transparent 60%), radial-gradient(900px 700px at 50% 80%, rgba(192, 132, 252, 0.2), transparent 60%)', animation: 'panGradient 20s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, rgba(255, 170, 136, 0.6), transparent 70%)' }} />
        <div className="pointer-events-none absolute top-1/2 right-1/4 h-80 w-80 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, rgba(255, 139, 123, 0.5), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139, 92, 246, 0.03) 10px, rgba(139, 92, 246, 0.03) 20px)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/40 px-3 py-1 text-[11px] text-gray-800 ring-1 ring-orange-400/20 backdrop-blur mb-6">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#FF8B7B' }} />
            Real People, Real Support
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900">Support That Feels Human.</h2>
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">Behind every great video is a great team — real people who care about your story as much as you do.</p>
        </div>

        <div className="mb-16 sm:mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {team.map((t, idx) => (
              <div key={t.name} className="team-card rounded-2xl overflow-hidden bg-white/60 ring-1 ring-gray-200/50 shadow-lg hover:shadow-2xl backdrop-blur" style={{ animation: `teamCardReveal .6s ease-out ${0.1 + idx * 0.1}s both` }}>
                <div className="aspect-[3/4] relative">
                  <Image src={t.img} alt={`${t.name} - ${t.role}`} width={600} height={800} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-50/20 to-transparent opacity-60" />
                  <div className="hover-overlay absolute inset-0 bg-gradient-to-br from-[#FFAA88]/95 to-[#FF8B7B]/95 opacity-0 transition-opacity flex flex-col items-center justify-center p-6">
                    <h3 className="text-xl font-semibold text-white mb-2">{t.name}</h3>
                    <p className="text-sm text-white/90 mb-4 font-medium">{t.role}</p>
                    <p className="text-sm text-white/95 text-center italic leading-relaxed">{t.quote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16 sm:mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 max-w-5xl mx-auto text-center">
            {highlights.map((h, i) => (
              <div key={h.title} className="group">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-6 mx-auto transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(255, 170, 136, 0.2), rgba(255, 139, 123, 0.25))', animation: `warmGlow 3s ease-in-out ${i * 0.5}s infinite` }}>
                  {i === 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M12 2a5 5 0 0 0-5 5v1h10V7a5 5 0 0 0-5-5z"/><path d="M5.5 8h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/><path d="M12 15v3"/></svg>
                  )}
                  {i === 1 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  )}
                  {i === 2 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-900">{h.title}</h3>
                <p className="text-base text-gray-700 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center relative">
          <p className="text-lg sm:text-xl text-gray-700 font-medium mb-6">Need help right now?</p>
          <a href="#" className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-xl transform" style={{ background: 'linear-gradient(to right, #FFAA88, #FF8B7B)', animation: 'gentlePulse 3s ease-in-out infinite' }}>
            <span>Talk to a Creative Expert</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <div className="floating-chat-bubble absolute -right-4 top-0 hidden lg:block">
            <div className="relative">
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255, 170, 136, 0.8), rgba(255, 139, 123, 0.8))', boxShadow: '0 8px 20px rgba(255, 139, 123, 0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" style={{ animation: 'sparkle 2s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(30, 27, 75, 0.3) 50%, rgba(30, 27, 75, 0.6) 100%)' }} />
    </section>
  );
}





