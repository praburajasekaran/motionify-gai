import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export function PolicyLayout({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} - Motionify Studio`;
    return () => { document.title = previousTitle; };
  }, [title]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-16 pt-32 sm:pt-40">
        <h1 className="mb-10 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <div className="space-y-8 text-base leading-7 sm:text-lg [&_a]:underline [&_a]:underline-offset-4">{children}</div>
        <div className="mt-12 border-t border-white/10 pt-8">
          <Link to="/" className="inline-flex items-center gap-2 rounded text-gray-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
