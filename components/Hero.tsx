// Using standard img tags instead of next/image
import { useEffect, useState } from "react";
import { landingButtonVariants } from "@/components/landing/LandingButton";

const carouselSlides = [
  {
    src: "/images/lp/Image1.jpg",
    alt: "AI-enhanced cinema lens with digital particles",
  },
  {
    src: "/images/lp/Image2.jpg",
    alt: "Animated brand world with a flying mechanical creature",
  },
  {
    src: "/images/lp/Image3.jpg",
    alt: "Production team reviewing footage on set",
  },
  {
    src: "/images/lp/Image4.jpg",
    alt: "Film frame with a profile and rising motion paths",
  },
];

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % carouselSlides.length);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-gray-950 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src="/images/lp/Image5.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.94)_0%,rgba(3,7,18,0.82)_38%,rgba(3,7,18,0.48)_72%,rgba(3,7,18,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.46)_0%,rgba(3,7,18,0.12)_46%,rgba(3,7,18,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_28%,rgba(20,184,166,0.24),transparent_44%),radial-gradient(ellipse_at_18%_16%,rgba(245,158,11,0.18),transparent_38%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      <div className="pt-24 pb-14 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/15 backdrop-blur">
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
                <a href="#video-style-quiz" className={landingButtonVariants({ variant: "primaryViolet", size: "lg", className: "gap-3" })}>
                  <span>Find Your Video Style</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
                </a>
                <a href="/contact" className={landingButtonVariants({ variant: "primaryOrange", size: "lg" })}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>
                  <span>Contact Us</span>
                </a>
              </div>

              <div className="mt-8 sm:mt-10 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur transition-all duration-300 hover:bg-white/[0.09] hover:shadow-[0_22px_55px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/20 ring-1 ring-violet-400/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">500+ Videos</p>
                    <p className="text-sm font-medium tracking-tight">Across industries</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur transition-all duration-300 hover:bg-white/[0.09] hover:shadow-[0_22px_55px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/20 ring-1 ring-blue-400/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" x2="9.01" y1="9" y2="9"></line><line x1="15" x2="15.01" y1="9" y2="9"></line></svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">98% Satisfaction</p>
                    <p className="text-sm font-medium tracking-tight">Client-verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur transition-all duration-300 hover:bg-white/[0.09] hover:shadow-[0_22px_55px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Trusted Brands</p>
                    <p className="text-sm font-medium tracking-tight">Seed to enterprise</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
                <div className="overflow-hidden rounded-lg border border-white/15 bg-white/[0.05] p-2 backdrop-blur-md">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-gray-950 sm:aspect-[5/6]">
                    {carouselSlides.map((slide, index) => (
                      <img
                        key={slide.src}
                        src={slide.src}
                        alt={slide.alt}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
                          activeSlide === index ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    ))}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.08)_0%,rgba(3,7,18,0)_46%,rgba(3,7,18,0.34)_100%)]" />
                    <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
                      {carouselSlides.map((slide, index) => (
                        <span
                          key={`${slide.src}-dot`}
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            activeSlide === index
                              ? "w-6 bg-white"
                              : "w-1.5 bg-white/45"
                          }`}
                          aria-hidden="true"
                        />
                      ))}
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
