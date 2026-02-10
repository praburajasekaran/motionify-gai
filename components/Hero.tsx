// Using standard img tags instead of next/image

export default function Hero() {
  return (
    <section className="relative text-white">
      {/* Background: Base dark fill + cinematic gradient layers */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Solid base to match original bg-gray-950 */}
        <div className="absolute inset-0 bg-gray-950 -z-20" />
        <div className="absolute inset-0 opacity-[0.85]" style={{
          background:
            "radial-gradient(1200px 600px at 20% 20%, rgba(168,85,247,0.20), transparent 60%)," +
            "radial-gradient(1000px 800px at 80% 30%, rgba(59,130,246,0.18), transparent 60%)," +
            "radial-gradient(900px 700px at 40% 80%, rgba(14,165,233,0.16), transparent 60%)",
          filter: "blur(0px)",
        }} />
        <div className="absolute inset-0" style={{
          background:
            "linear-gradient(120deg, rgba(186,123,255,0.14), rgba(59,130,246,0.12) 40%, rgba(99,102,241,0.12) 70%, rgba(14,165,233,0.10))",
          animation: "panGradient 16s ease-in-out infinite",
        }} />

        {/* Parallax colored orbs (static for now) */}
        <div className="absolute -top-24 left-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.35), rgba(168,85,247,0) 60%)" }} />
        <div className="absolute -bottom-28 -right-16 h-[26rem] w-[26rem] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle at 70% 70%, rgba(59,130,246,0.35), rgba(59,130,246,0) 60%)" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, rgba(14,165,233,0.28), rgba(14,165,233,0) 60%)" }} />
      </div>
      <div className="sm:pt-20 lg:pt-28 sm:pb-16 lg:pb-20 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/10 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Human‑centered video for modern brands
              </div>
              <h1 className="mt-4 sm:mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight font-semibold leading-[0.95]">
                Crafting stories that connect &amp; convert.
              </h1>
              <p className="sm:mt-5 sm:text-lg md:text-xl text-base text-white/80 max-w-2xl mt-4">
                We blend cinematic emotion with data‑driven strategy—so every frame earns attention and every story moves people to action.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
                <a href="#video-style-quiz" className="inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)] hover:brightness-110 transition">
                  <span>Find Your Video Style</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
                </a>
                <a href="#" className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] hover:shadow-[0_12px_32px_rgba(249,115,22,0.45)] hover:from-orange-600 hover:to-orange-700 transition-all duration-300 ring-2 ring-orange-400/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-300"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>
                  <span>Start Your Project</span>
                </a>
              </div>

              <div className="mt-8 sm:mt-10 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 ring-1 ring-violet-500/20 px-4 py-3 backdrop-blur hover:ring-violet-500/40 transition-all duration-300">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/20 ring-1 ring-violet-400/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">500+ Videos Created</p>
                    <p className="text-sm font-medium tracking-tight">Across industries</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 ring-1 ring-blue-500/20 px-4 py-3 backdrop-blur hover:ring-blue-500/40 transition-all duration-300">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/20 ring-1 ring-blue-400/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" x2="9.01" y1="9" y2="9"></line><line x1="15" x2="15.01" y1="9" y2="9"></line></svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">98% Client Satisfaction</p>
                    <p className="text-sm font-medium tracking-tight">Measured post‑launch</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 ring-1 ring-emerald-500/20 px-4 py-3 backdrop-blur hover:ring-emerald-500/40 transition-all duration-300">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Trusted by leading brands</p>
                    <p className="text-sm font-medium tracking-tight">From seed to enterprise</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto lg:ml-auto w-full max-w-md">
                <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 via-violet-500/20 to-blue-500/20 blur-2xl" />
                <div className="relative grid grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 backdrop-blur shadow-2xl">
                      <img src="/images/hero/hero-lens-minimal.png" alt="Cinema Lens" className="w-full h-full object-cover opacity-90" />
                    </div>
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 backdrop-blur shadow-2xl">
                      <img src="/images/hero/hero-waveform-minimal.png" alt="Digital Waveform" className="w-full h-full object-cover opacity-90" />
                    </div>
                  </div>
                  <div className="space-y-3 pt-6">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 backdrop-blur shadow-2xl">
                      <img src="/images/hero/hero-light-minimal.png" alt="Volumetric Light" className="w-full h-full object-cover opacity-90" />
                    </div>
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 backdrop-blur shadow-2xl">
                      <img src="/images/hero/hero-bokeh-minimal.png" alt="Abstract Bokeh" className="w-full h-full object-cover opacity-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


