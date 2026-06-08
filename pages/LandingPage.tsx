import React, { useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Quiz from '../components/quiz/Quiz';
import BrandLogos from '../components/BrandLogos';
import PortfolioGrid from '../components/PortfolioGrid';
import SolutionsSlider from '../components/SolutionsSlider/SolutionsSlider';
import ProcessTimeline from '../components/ProcessTimeline/ProcessTimeline';
import CreativeControlRoom from '../components/CreativeControlRoom';
import GlobalStorytelling from '../components/GlobalStorytelling/GlobalStorytelling';
import ClosingSection from '../components/ClosingSection';
import ReadyToTellYourStory from '../components/ReadyToTellYourStory';
import Footer from '../components/Footer';

export function LandingPage() {
  useEffect(() => {
    if (!window.location.hash) return;

    const targetId = decodeURIComponent(window.location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Quiz />
      <BrandLogos />
      <PortfolioGrid />
      <SolutionsSlider />
      <ProcessTimeline />
      <CreativeControlRoom />
      <GlobalStorytelling />
      <ClosingSection />
      <ReadyToTellYourStory />
      <Footer />
    </main>
  );
}
