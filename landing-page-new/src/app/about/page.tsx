import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'About Us - Motionify Studio',
  description: 'Motionify Studio is a transparent creative production workspace for planning, creating, tracking, and scaling high-performing visual stories.',
};

const pillars = [
  'Cinematic storytelling',
  'Strategic thinking',
  'Efficient workflows',
];

const countriesServed = [
  'India',
  'Australia',
  'Denmark',
  'Saudi Arabia',
  'United Arab Emirates',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16 overflow-hidden">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/10 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          Create with clarity
        </div>

        <h1 className="mt-5 max-w-3xl text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Where ideas turn into high-performing visual stories
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-10">
          <p className="text-gray-300 leading-relaxed">
            At Motionify Studio, we have reimagined how creative production works. No endless back-and-forth. No unclear timelines. No hidden processes.
          </p>

          <p className="text-gray-300 leading-relaxed">
            Just a seamless, transparent, and structured platform where you can plan, create, track, and scale your visual content - all in one place.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Create with clarity. Track with confidence. Deliver with impact.
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Motionify Studio Portal is your all-in-one creative production workspace, designed for brands, startups, and teams that want cinematic storytelling powered by efficiency and performance.
            </p>
            <p className="text-gray-300 leading-relaxed">
              From selecting services to final delivery, every step is streamlined - so you can focus on what matters most: your story and your results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Why Motionify Studio?</h2>
            <p className="text-gray-300 leading-relaxed">
              Because great stories deserve more than just creativity - they deserve structure, strategy, and execution that drives results.
            </p>
            <div className="not-prose grid grid-cols-1 gap-4 sm:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar} className="rounded-lg bg-white/5 px-4 py-4 ring-1 ring-white/10">
                  <span className="text-sm font-semibold text-orange-300">{pillar}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-300 leading-relaxed">
              So every project does not just look good - it performs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Countries We Serve</h2>
            <div className="not-prose flex flex-wrap gap-2">
              {countriesServed.map((country) => (
                <span
                  key={country}
                  className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-gray-300 ring-1 ring-white/10"
                >
                  {country}
                </span>
              ))}
            </div>
          </section>

          <section className="not-prose rounded-lg bg-white/5 px-5 py-6 ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold text-white">Start Your First Project Today</h2>
            <p className="mt-3 text-gray-300 leading-relaxed">
              Step into a smarter way of creating content. Explore Motionify Studio and bring your ideas to life - faster, better, and with purpose.
            </p>
            <Link
              href="/#video-style-quiz"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] ring-2 ring-orange-400/30 transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-[0_12px_32px_rgba(249,115,22,0.45)]"
            >
              Start Your Project
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
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
