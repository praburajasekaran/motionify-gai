import Header from '../components/Header';
import Footer from '../components/Footer';

export function ContactPage() {
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
            Let's build the next story
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            For project conversations, support requests, or partnership opportunities, reach out to Motionify Studio.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <a
              href="mailto:hello@motionify.studio"
              className="rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-orange-400/40 hover:bg-white/[0.07]"
            >
              <p className="text-sm font-medium text-white/55">New projects</p>
              <p className="mt-2 text-lg font-semibold text-orange-300">hello@motionify.studio</p>
            </a>
            <a
              href="mailto:support@motionify.studio"
              className="rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-orange-400/40 hover:bg-white/[0.07]"
            >
              <p className="text-sm font-medium text-white/55">Support</p>
              <p className="mt-2 text-lg font-semibold text-orange-300">support@motionify.studio</p>
            </a>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:hello@motionify.studio"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] ring-2 ring-orange-400/30 transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-[0_12px_32px_rgba(249,115,22,0.45)]"
            >
              Email Motionify
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Back to Home
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
