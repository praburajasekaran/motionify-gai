"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function SolutionsSlider() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(320 + 20);
  const [cardsPerView, setCardsPerView] = useState(1);
  const [active, setActive] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  // Calculate total pages based on cards per view
  const totalPages = Math.ceil(solutions.length / cardsPerView);
  const dots = useMemo(() => Array.from({ length: totalPages }, (_, i) => i), [totalPages]);

  // Calculate card width and cards per view
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLDivElement>(".snap-start");

    const update = () => {
      const trackWidth = track.offsetWidth;
      const gap = parseInt(window.getComputedStyle(track).gap || "16", 10) || 16;
      const cardW = firstCard?.getBoundingClientRect().width ?? 300;

      const perView = Math.floor((trackWidth + gap) / (cardW + gap));
      setCardsPerView(Math.max(1, perView));
      setCardWidth(cardW + gap);

      updateScrollState();
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const updateScrollState = () => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 1);
    setCanScrollRight(track.scrollLeft < track.scrollWidth - track.clientWidth - 1);
  };

  // Track scroll position and update active dot
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let t: number | undefined;

    const onScroll = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        const pageWidth = cardsPerView * cardWidth;
        const currentPage = Math.round(track.scrollLeft / pageWidth);
        setActive(Math.max(0, Math.min(currentPage, totalPages - 1)));
        updateScrollState();
      }, 80);
    };

    track.addEventListener("scroll", onScroll);
    return () => track.removeEventListener("scroll", onScroll);
  }, [cardWidth, cardsPerView, totalPages]);

  // Auto-scroll: advance one card every 3 seconds, loop, resume after interaction
  const startAutoScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);

    autoScrollIntervalRef.current = setInterval(() => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const next = track.scrollLeft + (cardWidth || 340);
      track.scrollTo({ left: next >= maxScroll ? 0 : next, behavior: "smooth" });
    }, 3000);
  }, [cardWidth]);

  const pauseAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    // Resume after 5 seconds of inactivity
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => startAutoScroll(), 5000);
  }, [startAutoScroll]);

  useEffect(() => {
    const delay = setTimeout(() => startAutoScroll(), 1500);
    return () => {
      clearTimeout(delay);
      if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [startAutoScroll]);

  // Mouse drag-to-scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartXRef.current = e.pageX - track.offsetLeft;
      dragScrollLeftRef.current = track.scrollLeft;
      track.style.cursor = "grabbing";
      track.style.userSelect = "none";
      pauseAutoScroll();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - dragStartXRef.current) * 1.2;
      track.scrollLeft = dragScrollLeftRef.current - walk;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      track.style.cursor = "grab";
      track.style.userSelect = "";
    };

    const onMouseLeave = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        track.style.cursor = "grab";
        track.style.userSelect = "";
      }
    };

    track.style.cursor = "grab";
    track.addEventListener("mousedown", onMouseDown);
    track.addEventListener("mousemove", onMouseMove);
    track.addEventListener("mouseup", onMouseUp);
    track.addEventListener("mouseleave", onMouseLeave);

    return () => {
      track.removeEventListener("mousedown", onMouseDown);
      track.removeEventListener("mousemove", onMouseMove);
      track.removeEventListener("mouseup", onMouseUp);
      track.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [pauseAutoScroll]);

  // Mouse wheel horizontal scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // already horizontal
      e.preventDefault();
      track.scrollLeft += e.deltaY;
      pauseAutoScroll();
    };

    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, [pauseAutoScroll]);

  // Touch: pause auto-scroll on touch
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onTouch = () => pauseAutoScroll();
    track.addEventListener("touchstart", onTouch, { passive: true });
    return () => track.removeEventListener("touchstart", onTouch);
  }, [pauseAutoScroll]);

  const scrollBy = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    pauseAutoScroll();
    const scrollAmount = cardsPerView * cardWidth;
    const newScrollLeft = track.scrollLeft + dir * scrollAmount;
    const maxScroll = track.scrollWidth - track.clientWidth;
    track.scrollTo({ left: Math.max(0, Math.min(newScrollLeft, maxScroll)), behavior: "smooth" });
  };

  const scrollToPage = (pageIndex: number) => {
    const track = trackRef.current;
    if (!track) return;
    pauseAutoScroll();
    const scrollAmount = pageIndex * cardsPerView * cardWidth;
    const maxScroll = track.scrollWidth - track.clientWidth;
    track.scrollTo({ left: Math.min(scrollAmount, maxScroll), behavior: "smooth" });
  };

  return (
    <section className="overflow-hidden sm:py-20 bg-gradient-to-br from-white via-gray-50 to-indigo-50 pt-16 pb-16 relative text-gray-900">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="pointer-events-none absolute -inset-x-24 -top-24 h-64 blur-3xl opacity-60" style={{ background: "radial-gradient(60% 120% at 50% 0%, rgba(99,102,241,0.18), rgba(99,102,241,0))" }} />
      <div className="pointer-events-none absolute -inset-x-24 -bottom-28 h-72 blur-3xl opacity-50" style={{ background: "radial-gradient(80% 140% at 50% 100%, rgba(59,130,246,0.16), rgba(59,130,246,0))" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:gap-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">Solutions, Not Just Services.</h2>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-700">Every brand is unique. We craft videos that move people — and metrics.</p>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl">From awareness to conversions, our solutions grow with your goals.</p>
        </div>

        <div className="mt-8 relative">
          <div className="absolute -top-12 right-0 flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              className={`h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 flex items-center justify-center transition-all ${canScrollLeft ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              className={`h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 flex items-center justify-center transition-all ${canScrollRight ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          <div ref={trackRef} id="solutionsTrack" className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`#solutionsTrack::-webkit-scrollbar{display:none;}`}</style>

            {solutions.map((s, i) => (
              <div key={s.title} className="snap-start shrink-0 w-[260px] sm:w-[300px] md:w-[320px] rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm hover:shadow-xl transition ease-out hover:-translate-y-0.5 overflow-hidden" style={{ viewTimelineName: `--reveal${i + 1}`, viewTimelineAxis: 'block', animationTimeline: `--reveal${i + 1}`, animationName: i % 2 === 0 ? 'fadeUp' : 'slideIn', animationRange: 'entry 15% cover 30%', animationFillMode: 'both' }}>
                {/* Solution image/illustration */}
                <div className={`h-32 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
                  <Image
                    src={s.image}
                    alt={s.title}
                    width={320}
                    height={200}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />

                  {/* Icon overlay */}
                  <div className={`h-12 w-12 rounded-xl backdrop-blur-md bg-white/90 ring-1 ring-white/50 flex items-center justify-center ${s.iconColor} shadow-lg relative z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300`}>
                    <div className="scale-90">
                      {s.icon}
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-8 bg-white relative z-20">
                  <h3 className="text-base font-medium tracking-tight text-gray-900">{s.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:flex justify-center gap-2 mt-6">
            {dots.map((i) => (
              <button key={i} onClick={() => scrollToPage(i)} className={`solution-dot ${active === i ? 'active' : ''}`} aria-label={`Go to page ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const solutions = [
  {
    title: "Brand Awareness",
    desc: "Build your identity and capture attention.",
    iconColor: "text-violet-600",
    image: "/images/solutions/sol-brand.png",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" /><path d="M8 6v8" /></svg>
    ),
  },
  {
    title: "Product Launch",
    desc: "Generate buzz and showcase innovation.",
    iconColor: "text-indigo-600",
    image: "/images/solutions/sol-launch.png",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>
    ),
  },
  {
    title: "Training & Education",
    desc: "Simplify complex ideas.",
    iconColor: "text-cyan-600",
    image: "/images/solutions/sol-train.png",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>
    ),
  },
  {
    title: "Social Media Content",
    desc: "Create scroll-stopping content for every platform.",
    iconColor: "text-pink-600",
    image: "/images/solutions/sol-social.png",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
    ),
  },
  {
    title: "Corporate Communications",
    desc: "Engage employees and stakeholders with clarity.",
    iconColor: "text-blue-600",
    image: "/images/solutions/sol-corp.png",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
  {
    title: "Explainer Videos",
    desc: "Turn complexity into compelling clarity.",
    iconColor: "text-emerald-600",
    image: "/images/solutions/sol-explain.png",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
    ),
  },
];





