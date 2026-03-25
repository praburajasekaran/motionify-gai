

export default function Footer() {
  return (
    <footer className="relative bg-gray-950 border-t border-white/5 text-white">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Logo and Intro */}
          <div className="lg:col-span-4 flex flex-col items-start gap-6 text-left">
            <img src="/motionify-light-logo.png" alt="Motionify.Studio" className="h-10 w-auto object-contain" />
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Crafting stories that connect and convert. From concept to final cut, we bring your vision to life with creativity and precision.
            </p>
          </div>

          {/* Navigation Links - 2 Columns */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-8 sm:gap-12">
            {/* Column 1 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Company</h3>
              <nav className="flex flex-col gap-3">
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Works</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Approach</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Pricing</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Case Studies</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Contact</a>
              </nav>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Resources</h3>
              <nav className="flex flex-col gap-3">
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Blog</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Portfolio</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">FAQs</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">About Us</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Careers</a>
              </nav>
            </div>
          </div>

          {/* CTA and Social */}
          <div className="lg:col-span-3 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Get Started</h3>
              <a href="#" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 transform hover:scale-105">
                <span>Start Your Project</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Follow Us</h3>
              <div className="flex items-center gap-4">
                <a href="#" className="h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 flex items-center justify-center transition-all duration-200 group">
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">IN</span>
                </a>
                <a href="#" className="h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 flex items-center justify-center transition-all duration-200 group">
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">LI</span>
                </a>
                <a href="#" className="h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 flex items-center justify-center transition-all duration-200 group">
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">FB</span>
                </a>
                <a href="#" className="h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 flex items-center justify-center transition-all duration-200 group">
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">YT</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2025 Motionify.Studio. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Terms and Conditions</a>
            <a href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="/shipping" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Shipping Policy</a>
            <a href="/cancellation-refund" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancellation & Refunds</a>
            <a href="/contact" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}





