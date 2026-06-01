import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const videos = [
  {
    title: "Live Action",
    type: "YouTube",
    src: "https://www.youtube.com/embed/sd2dd7tmY-Y",
  },
  {
    title: "Animation",
    type: "YouTube",
    src: "https://www.youtube.com/embed/gxPuAgTcxp4",
  },
  {
    title: "Mixed Media",
    type: "YouTube",
    src: "https://www.youtube.com/embed/BaDfOeN9SLA",
  },
  {
    title: "Motion Graphics",
    type: "YouTube",
    src: "https://www.youtube.com/embed/By8VKDeZ4Sc",
  },
  {
    title: "Minimal Explainer",
    type: "YouTube",
    src: "https://www.youtube.com/embed/VUz3VfAezBA",
  },
];

export default function PortfolioGrid() {
  const visibleCount = 3;
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleVideos = Array.from({ length: visibleCount }, (_, offset) => {
    const index = (activeIndex + offset) % videos.length;
    return videos[index];
  });
  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + videos.length) % videos.length);
  };
  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % videos.length);
  };

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
          <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">See Creativity in Motion.</h2>
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={goToPrevious}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                aria-label="Previous videos"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                aria-label="Next videos"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-x-10 -top-6 h-24 rounded-full blur-2xl opacity-70" style={{ background: "radial-gradient(60% 100% at 50% 50%, rgba(99,102,241,0.18), rgba(99,102,241,0))" }} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
              {visibleVideos.map((v) => (
                <div key={v.src} className="group relative overflow-hidden rounded-lg bg-gray-900/90 ring-1 ring-gray-700/50 shadow-xl">
                  <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
                  <div className="px-4 py-3 bg-gray-900/95 backdrop-blur">
                    <p className="text-base font-medium leading-tight text-white">{v.title}</p>
                    {"type" in v && v.type ? (
                      <p className="mt-1 text-sm leading-tight text-gray-300">{v.type}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={goToPrevious}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                aria-label="Previous videos"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                aria-label="Next videos"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex justify-center gap-2" aria-label="Portfolio carousel position">
              {videos.map((v, index) => (
                <button
                  key={v.src}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                    activeIndex === index ? 'w-8 bg-violet-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Show ${v.title}`}
                  aria-current={activeIndex === index ? 'true' : undefined}
                />
              ))}
            </div>

            <div className="mt-8 sm:mt-10 flex justify-center">
              <a href="/work" className="inline-flex items-center gap-2 sm:px-6 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 rounded-full pt-3 pr-5 pb-3 pl-5 shadow-[0_8px_24px_rgba(99,102,241,0.25)]">
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


