import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProcessTimeline from "@/components/ProcessTimeline/ProcessTimeline";
import PricingSection from "@/components/PricingSection";
import ReadyToTellYourStory from "@/components/ReadyToTellYourStory";

export const metadata: Metadata = {
  title: "Our Work — Motionify.Studio",
  description: "See our portfolio of brand films, explainers, product launches, and more. Discover our approach and transparent pricing.",
};

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

export default function WorkPage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* ── Work / Portfolio ─────────────────────────────────── */}
      <section
        id="work"
        className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 bg-gray-950 text-white"
      >
        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 600px at 20% 20%, rgba(168,85,247,0.14), transparent 60%)," +
                "radial-gradient(1000px 800px at 80% 30%, rgba(59,130,246,0.12), transparent 60%)," +
                "radial-gradient(900px 700px at 40% 80%, rgba(14,165,233,0.10), transparent 60%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, rgba(99,102,241,0.06), rgba(59,130,246,0.06) 40%, rgba(168,85,247,0.06))",
              animation: "panGradient 22s ease-in-out infinite",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 3px)",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page heading */}
          <div className="mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500/15 to-blue-500/15 px-4 py-1.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30 backdrop-blur mb-5">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-blue-400 animate-pulse" />
              Our Portfolio
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              See Creativity{" "}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                in Motion.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/60 max-w-2xl">
              A selection of brand films, explainers, product launches, and training
              videos we've crafted for companies across industries.
            </p>
          </div>

          {/* Video grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {videos.map((v) => (
              <div
                key={v.src}
                className="group relative rounded-2xl overflow-hidden bg-gray-900/90 ring-1 ring-gray-700/50 shadow-lg hover:ring-gray-600/60 hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                <div className="relative aspect-video overflow-hidden">
                  <iframe
                    src={
                      v.src +
                      (v.src.includes("youtube")
                        ? "?controls=1&modestbranding=1&rel=0&playsinline=1"
                        : "?title=0&byline=0&portrait=0&dnt=1")
                    }
                    title={v.title}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                  />
                </div>
                <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-900/95">
                  <p className="text-sm font-medium tracking-tight text-white leading-tight">
                    {v.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{v.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Approach (ProcessTimeline) ───────────────────────── */}
      <div id="approach">
        <ProcessTimeline />
      </div>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <PricingSection />

      {/* ── Final CTA ───────────────────────────────────────── */}
      <ReadyToTellYourStory />

      <Footer />
    </main>
  );
}
