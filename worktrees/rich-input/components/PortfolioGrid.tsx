// Using standard img tags

export default function PortfolioGrid() {
  const videos = [
    {
      title: "Creativity in Motion",
      type: "YouTube Showcase",
      src: "https://www.youtube.com/embed/ZDzXCMLkl1c",
    },
    {
      title: "Brand Film 01",
      type: "Vimeo — Brand Film",
      src: "https://player.vimeo.com/video/751616114",
    },
    {
      title: "Explainer 3D Walkthrough",
      type: "Vimeo — Explainer",
      src: "https://player.vimeo.com/video/760954768",
    },
    {
      title: "Product Launch Reel",
      type: "Vimeo — Launch Reel",
      src: "https://player.vimeo.com/video/600744481",
    },
    {
      title: "Training & Education",
      type: "Vimeo — Training",
      src: "https://player.vimeo.com/video/600803860",
    },
  ];

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 bg-gray-50 text-gray-900">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(99,102,241,0.06), rgba(59,130,246,0.06) 40%, rgba(168,85,247,0.06))", animation: "panGradient 22s ease-in-out infinite" }} />
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(17,24,39,0.03) 0px, rgba(17,24,39,0.03) 1px, transparent 1px, transparent 3px)" }} />
        <div className="absolute -inset-x-20 -top-24 h-56 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(60% 120% at 50% 0%, rgba(99,102,241,0.20), rgba(99,102,241,0))" }} />
        <div className="absolute -inset-x-24 -bottom-28 h-72 rounded-full blur-3xl opacity-35" style={{ background: "radial-gradient(80% 140% at 50% 100%, rgba(59,130,246,0.16), rgba(59,130,246,0))" }} />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">See Creativity in Motion.</h2>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-x-10 -top-6 h-24 rounded-full blur-2xl opacity-70" style={{ background: "radial-gradient(60% 100% at 50% 50%, rgba(99,102,241,0.18), rgba(99,102,241,0))" }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
              {videos.map((v) => (
                <div key={v.src} className="group relative rounded-2xl overflow-hidden bg-gray-900/90 ring-1 ring-gray-700/50 shadow-lg">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <iframe
                      src={v.src + (v.src.includes("youtube") ? "?controls=1&modestbranding=1&rel=0&playsinline=1" : "?title=0&byline=0&portrait=0&dnt=1")}
                      title={v.title}
                      className="w-full h-full"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      allowFullScreen
                    />
                    
                  </div>
                  <div className="p-3 sm:p-4 bg-gray-900/95 backdrop-blur">
                    <p className="text-sm font-medium tracking-tight text-white">{v.title}</p>
                    {"type" in v && v.type ? (
                      <p className="text-xs text-gray-400 mt-0.5">{v.type}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 sm:mt-10 flex justify-center">
              <a href="#" className="inline-flex items-center gap-2 sm:px-6 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 rounded-full pt-3 pr-5 pb-3 pl-5 shadow-[0_8px_24px_rgba(99,102,241,0.25)]">
                Explore Full Portfolio
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}





