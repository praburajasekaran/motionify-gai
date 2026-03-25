export default function ReadyToTellYourStory() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 text-gray-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(249,115,22,0.08), rgba(245,158,11,0.08) 40%, rgba(251,191,36,0.08))", animation: "panGradient 20s ease-in-out infinite" }} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(249,115,22,0.03) 0px, rgba(249,115,22,0.03) 2px, transparent 2px, transparent 12px)" }} />
        {/* Colorful orbs */}
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-orange-400 to-amber-500" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-yellow-400 to-orange-500" />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-5xl mx-auto">
          {/* Main content */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-4 py-1.5 text-xs font-medium text-orange-700 ring-1 ring-orange-500/20 backdrop-blur mb-6">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse" />
              Your Story Awaits
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[0.95]">
              <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Ready to Tell Your Story
              </span>
              <br />
              <span className="text-gray-900">with Motionify?</span>
            </h2>

            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-12">
              Whether you're launching a product, building your brand, or educating your audience —
              we're here to transform your vision into compelling video experiences that drive real results.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="#video-style-quiz"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transform transition-all duration-300 hover:scale-105 ring-2 ring-orange-400/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
                <span>Start Your Video Journey</span>
              </a>

              <a
                href="#"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-white/80 backdrop-blur text-gray-900 font-semibold text-lg ring-2 ring-gray-300 hover:ring-gray-400 hover:bg-white transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Talk to Our Team</span>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto pt-8 border-t border-gray-300">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 ring-2 ring-orange-400/30 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <div className="text-2xl font-bold text-gray-900">98%</div>
                <div className="text-sm text-gray-600">Client Satisfaction</div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 ring-2 ring-amber-400/30 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></svg>
                </div>
                <div className="text-2xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-600">Videos Created</div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 ring-2 ring-yellow-400/30 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                </div>
                <div className="text-2xl font-bold text-gray-900">7-14 Days</div>
                <div className="text-sm text-gray-600">Average Turnaround</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
