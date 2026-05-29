import Header from '../components/Header';
import Footer from '../components/Footer';

const processSteps = [
  'Brief & Kick-off Call',
  'Script Writing',
  'Design & Storyboard',
  'Music & Voice Over',
  'Visual Scenes & Animation',
  'Compositing & Delivery',
];

const industries = [
  'Healthcare',
  'Wellness',
  'Real Estate',
  'Manufacturing',
  'Oil & Gas',
  'Robotics',
  'Infrastructure',
  'Education',
  'Automotive',
  'Logistics',
  'Food',
  'Cosmetics',
  'Information Technology',
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

        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/10 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Production, animation, and post-production
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            About Us
          </h1>

          <div className="mt-8 space-y-8 text-white/75">
            <p className="text-base leading-7 sm:text-lg">
              As a production house, Motionify Studio brings to the table the best production and post-production team in the industry, with leading names in cinematography, animation, visual effects, sound technology, and editing working under the Motionify Studio banner.
            </p>

            <p className="text-base leading-7 sm:text-lg">
              Motionify Studio's thoughtful concepts, effortless presentation, and convincing production, enhanced by brilliant quality, can put your video pitch ahead of anything your competitors have. We work with our clients to realize their dream by translating their thoughts into visuals.
            </p>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Our Story</h2>
              <p className="leading-7">
                Founded in 2017 and formerly known as RootsBridge, Motionify Studio has grown into an award-winning video production and 3D animation agency. Operating from Chennai and Bangalore, our work has been noticed, discussed, and awarded around the world, and has been recognized on various elite platforms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">What We Do</h2>
              <p className="leading-7">
                We are your go-to agency for 3D animation and corporate video production, enhancing brand storytelling with creativity, quality, and timely delivery. You get a full team of professionals who have loads of experience working together, along with a full-service experience from the first meeting to the final produced video including audio, video, and post-production.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Our Process</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {processSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 ring-1 ring-white/10">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-300">
                      {index + 1}
                    </span>
                    <span className="text-sm text-white/75">{step}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Industries We Serve</h2>
              <div className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <span key={industry} className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-white/75 ring-1 ring-white/10">
                    {industry}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Awards & Recognition</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                  <span>Futuristic & Creative Video Production & Digital Agency of the Year 2023</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                  <span>Most Creative Video Production Company of the Year - Right Choice Awards 2023</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
