import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'About Us - Motionify Studio',
  description: 'Learn about Motionify Studio — a creative video production studio crafting stories that connect and convert.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          About Us
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <p className="text-gray-300 leading-relaxed">
            Motionify Studio is a creative video production studio dedicated to crafting stories that connect and convert. From concept to final cut, we bring your vision to life with creativity and precision.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              We believe every brand has a story worth telling. Our mission is to help businesses communicate their message through compelling visual content that resonates with their audience and drives results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">What We Do</h2>
            <p className="text-gray-300 leading-relaxed">
              We specialize in end-to-end video production — from ideation and scripting to filming, editing, and post-production. Whether it&apos;s brand films, explainer videos, social media content, or corporate videos, we deliver polished, high-impact visuals tailored to your goals.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Why Motionify</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>Creative storytelling that captures attention and drives engagement</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>Trusted by global brands for reliability and quality</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>End-to-end production with fast turnaround times</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>A collaborative process that keeps you involved every step of the way</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
