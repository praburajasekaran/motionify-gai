import { landingButtonVariants } from "@/components/landing/LandingButton";

export default function Footer() {
  return (
    <footer className="relative bg-gray-950 border-t border-white/5 text-white">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Logo and Intro */}
          <div className="lg:col-span-4 flex flex-col items-start gap-6 text-left">
            <img src="/motionify-light-logo.png" alt="Motionify Studio" className="h-10 w-auto object-contain" />
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Crafting stories that connect and convert. From concept to final cut, we bring your vision to life with creativity and precision.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-5">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Company</h3>
              <nav className="flex flex-col gap-3">
                <a href="/about" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">About Us</a>
                <a href="/work" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Works</a>
                <a href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Contact</a>
              </nav>
            </div>
          </div>

          {/* CTA and Social */}
          <div className="lg:col-span-3 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Contact Us</h3>
              <a href="#video-style-quiz" className={landingButtonVariants({ variant: "primaryOrange", size: "lg", className: "font-semibold" })}>
                <span>Contact Us</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </a>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Follow Us</h3>
              <div className="flex items-center gap-4">
                <a href="https://www.instagram.com/motionifyco/" target="_blank" rel="noopener noreferrer" className={landingButtonVariants({ variant: "secondaryDark", size: "iconMd", className: "group" })}>
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">IN</span>
                </a>
                <a href="https://www.linkedin.com/company/motionify/" target="_blank" rel="noopener noreferrer" className={landingButtonVariants({ variant: "secondaryDark", size: "iconMd", className: "group" })}>
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">LI</span>
                </a>
                <a href="https://www.facebook.com/motionify/" target="_blank" rel="noopener noreferrer" className={landingButtonVariants({ variant: "secondaryDark", size: "iconMd", className: "group" })}>
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">FB</span>
                </a>
                <a href="https://www.youtube.com/channel/UCK9Ja6n4m4cRbZKo5I2zDOw" target="_blank" rel="noopener noreferrer" className={landingButtonVariants({ variant: "secondaryDark", size: "iconMd", className: "group" })}>
                  <span className="text-gray-400 group-hover:text-white text-xs font-medium">YT</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2026 Motionify Studio. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Terms and Conditions</a>
            <a href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="/shipping" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Shipping Policy</a>
            <a href="/cancellation-refund" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancellation & Refunds</a>
          </div>
        </div>
      </div>
    </footer>
  );
}



