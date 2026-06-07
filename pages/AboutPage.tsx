import Header from '../components/Header';
import Footer from '../components/Footer';

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

export function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="relative overflow-hidden px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gray-950" />
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                'radial-gradient(900px 500px at 18% 18%, rgba(249,115,22,0.18), transparent 58%), radial-gradient(900px 700px at 80% 30%, rgba(59,130,246,0.16), transparent 62%)',
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl lg:pl-10">
          <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/10 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Create with clarity
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Where ideas turn into high-performing visual stories
          </h1>

          <div className="mt-8 space-y-10 text-white/75">
            <p className="text-base leading-7 sm:text-lg">
              At Motionify Studio, we have reimagined how creative production works. No endless back-and-forth. No unclear timelines. No hidden processes.
            </p>

            <p className="text-base leading-7 sm:text-lg">
              Just a seamless, transparent, and structured platform where you can plan, create, track, and scale your visual content - all in one place.
            </p>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                Create with clarity. Track with confidence. Deliver with impact.
              </h2>
              <p className="leading-7 sm:text-lg">
                Motionify Studio Portal is your all-in-one creative production workspace, designed for brands, startups, and teams that want cinematic storytelling powered by efficiency and performance.
              </p>
              <p className="leading-7">
                From selecting services to final delivery, every step is streamlined - so you can focus on what matters most: your story and your results.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Why Motionify Studio?</h2>
              <p className="leading-7">
                Because great stories deserve more than just creativity - they deserve structure, strategy, and execution that drives results.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {pillars.map((pillar) => (
                  <div key={pillar} className="rounded-lg bg-white/5 px-4 py-4 ring-1 ring-white/10">
                    <span className="text-sm font-semibold text-orange-300">{pillar}</span>
                  </div>
                ))}
              </div>
              <p className="leading-7">
                So every project does not just look good - it performs.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Countries We Serve</h2>
              <div className="flex flex-wrap gap-2">
                {countriesServed.map((country) => (
                  <span key={country} className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-white/75 ring-1 ring-white/10">
                    {country}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-lg bg-white/5 px-5 py-6 ring-1 ring-white/10">
              <h2 className="text-2xl font-semibold text-white">Start Your First Project Today</h2>
              <p className="leading-7">
                Step into a smarter way of creating content. Explore Motionify Studio and bring your ideas to life - faster, better, and with purpose.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] ring-2 ring-orange-400/30 transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-[0_12px_32px_rgba(249,115,22,0.45)]"
              >
                Start Your Project
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </a>
            </section>
          </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
