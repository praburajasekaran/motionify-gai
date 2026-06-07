import Footer from '../components/Footer';
import Header from '../components/Header';
import LazyYouTubeEmbed from '../components/LazyYouTubeEmbed';
import { landingButtonVariants } from '../components/landing/LandingButton';
import { workVideos } from '../data/workVideos';

const approachSteps = [
  {
    title: 'Discover the story',
    body: 'We align on audience, message, channel, and the moment the video needs to create.',
  },
  {
    title: 'Shape the direction',
    body: 'We turn the brief into a clear creative route with script, structure, visuals, and production plan.',
  },
  {
    title: 'Create with momentum',
    body: 'Motion, design, edit, sound, and review loops move together so every milestone stays visible.',
  },
  {
    title: 'Deliver for impact',
    body: 'Final assets are prepared for the platforms where the story needs to perform.',
  },
];

export function WorkPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="relative overflow-hidden px-4 pt-32 pb-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gray-950" />
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(900px 520px at 20% 12%, rgba(249,115,22,0.18), transparent 58%), radial-gradient(900px 720px at 82% 28%, rgba(99,102,241,0.18), transparent 62%)',
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/10 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Motionify Studio work
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Visual stories built for clarity, motion, and results
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Explore a selection of Motionify videos across animation, explainers, product stories, and campaign-ready edits.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workVideos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/10">
                <LazyYouTubeEmbed videoId={video.id} title={video.title} className="rounded-b-none ring-0" />
                <div className="px-4 py-4">
                  <h2 className="text-base font-semibold text-white">{video.title}</h2>
                  <p className="mt-1 text-sm text-white/75">YouTube showcase</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 text-gray-950 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Our approach</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A clear path from brief to finished film
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              The work moves through focused milestones so teams can see what is happening, respond quickly, and keep the final story aligned with the goal.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
            {approachSteps.map((step, index) => (
              <article key={step.title} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <span className="text-sm font-semibold text-orange-600">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 text-lg font-semibold text-gray-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{step.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10">
            <a href="/contact" className={landingButtonVariants({ variant: 'primaryOrange', size: 'lg' })}>
              Start a project conversation
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
