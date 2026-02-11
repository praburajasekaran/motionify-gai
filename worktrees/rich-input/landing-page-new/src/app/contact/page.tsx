import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'Contact Us - Motionify Studio',
  description: 'Contact information for Motionify Studio',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Contact Us
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <p className="text-gray-300 leading-relaxed">
            For any queries, support requests, or partnership opportunities, please reach out to us:
          </p>

          <section>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-2xl">📍</span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Location</h3>
                  <p className="text-gray-300">Chennai, India</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">📧</span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Email</h3>
                  <p className="text-gray-300">
                    <a href="mailto:support@motionify.studio" className="text-orange-400 hover:text-orange-300 transition-colors">
                      support@motionify.studio
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">🌐</span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Website</h3>
                  <p className="text-gray-300">
                    <a href="https://www.motionify.studio" className="text-orange-400 hover:text-orange-300 transition-colors" target="_blank" rel="noopener noreferrer">
                      www.motionify.studio
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">🕐</span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Support Hours</h3>
                  <p className="text-gray-300">Monday – Friday, 10:00 AM – 6:00 PM IST</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="text-gray-300 leading-relaxed">
              You can also use the "Contact Us" form available on our website to send direct messages related to your project or service inquiry.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

