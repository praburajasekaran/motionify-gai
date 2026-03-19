import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'About Us - Motionify Studio',
  description: 'Motionify is an award-winning video production and 3D animation agency, formerly known as RootsBridge, founded in 2017.',
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
            As a production house, Motionify brings to the table the best production and post-production team in the industry, with leading names in the world of cinematography, animation, visual effects, sound technology, and editing working under the Motionify banner.
          </p>

          <p className="text-gray-300 leading-relaxed">
            Motionify&apos;s thoughtful concepts, effortless presentation, and convincing production, enhanced by brilliant quality, can put your video pitch ahead of anything your competitors have. We work with our clients to realize their dream by translating their thoughts into visuals.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Story</h2>
            <p className="text-gray-300 leading-relaxed">
              Founded in 2017 and formerly known as RootsBridge, Motionify has grown into an award-winning video production and 3D animation agency. Operating from Chennai and Bangalore, our work has been noticed, discussed, and awarded around the world, and has been recognized on various elite platforms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">What We Do</h2>
            <p className="text-gray-300 leading-relaxed">
              We are your go-to agency for 3D animation and corporate video production, enhancing brand storytelling with creativity, quality, and timely delivery. You get a full team of professionals who have loads of experience working together, along with a full-service experience from the first meeting to the final produced video including audio, video, and post-production.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Process</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Brief & Kick-off Call',
                'Script Writing',
                'Design & Storyboard',
                'Music & Voice Over',
                'Visual Scenes & Animation',
                'Compositing & Delivery',
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-gray-300 text-sm">{step}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Industries We Serve</h2>
            <div className="flex flex-wrap gap-2">
              {[
                'Healthcare', 'Wellness', 'Real Estate', 'Manufacturing',
                'Oil & Gas', 'Robotics', 'Infrastructure', 'Education',
                'Automotive', 'Logistics', 'Food', 'Cosmetics',
                'Information Technology',
              ].map((industry) => (
                <span
                  key={industry}
                  className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-gray-300 ring-1 ring-white/10"
                >
                  {industry}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Awards & Recognition</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>Futuristic & Creative Video Production & Digital Agency of the Year 2023</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>Most Creative Video Production Company of the Year — Right Choice Awards 2023</span>
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
