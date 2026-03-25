import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Quiz from "@/components/Quiz/Quiz";
import PortfolioGrid from "@/components/PortfolioGrid";
import SolutionsSlider from "@/components/SolutionsSlider/SolutionsSlider";
import ProcessTimeline from "@/components/ProcessTimeline/ProcessTimeline";
import CreativeControlRoom from "@/components/CreativeControlRoom";
import GlobalStorytelling from "@/components/GlobalStorytelling/GlobalStorytelling";
import ClosingSection from "@/components/ClosingSection";
import Footer from "@/components/Footer";

export default function V2() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Quiz />
      <PortfolioGrid />
      <SolutionsSlider />
      <ProcessTimeline />
      <CreativeControlRoom />
      <GlobalStorytelling />
      <ClosingSection />
      <Footer />
    </main>
  );
}


