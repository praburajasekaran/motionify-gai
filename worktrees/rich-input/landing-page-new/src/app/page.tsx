import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Quiz from "@/components/Quiz/Quiz";
import BrandLogos from "@/components/BrandLogos";
import PortfolioGrid from "@/components/PortfolioGrid";
import SolutionsSlider from "@/components/SolutionsSlider/SolutionsSlider";
import ProcessTimeline from "@/components/ProcessTimeline/ProcessTimeline";
import CreativeControlRoom from "@/components/CreativeControlRoom";
import GlobalStorytelling from "@/components/GlobalStorytelling/GlobalStorytelling";
import ClosingSection from "@/components/ClosingSection";
import ReadyToTellYourStory from "@/components/ReadyToTellYourStory";
import Footer from "@/components/Footer";

export default function Home() {
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
