import Link from "next/link";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    tagline: "Short-form & Social",
    // TODO: Replace placeholder price with actual pricing
    price: "From ₹XX,000",
    description: "Perfect for brands that need scroll-stopping content fast.",
    features: [
      "Up to 60 seconds",
      "1 round of revisions",
      "Basic motion graphics",
      "Social media delivery",
      "7-day turnaround",
    ],
    cta: "Get in touch",
    href: "/contact",
    highlight: false,
  },
  {
    name: "Pro",
    tagline: "Brand Films & Explainers",
    // TODO: Replace placeholder price with actual pricing
    price: "From ₹XX,000",
    description: "For growing companies ready to tell a bigger story.",
    features: [
      "Up to 3 minutes",
      "3 rounds of revisions",
      "Custom animation",
      "Licensed music",
      "Multi-platform formats",
      "14-day turnaround",
    ],
    cta: "Get in touch",
    href: "/contact",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Studio",
    tagline: "Full Campaign Production",
    // TODO: Replace placeholder price with actual pricing
    price: "Custom",
    description: "Enterprise-grade production for campaigns that demand the best.",
    features: [
      "Any duration",
      "Unlimited revisions",
      "Full production crew",
      "Scriptwriting included",
      "Custom score & voiceover",
      "Dedicated producer",
    ],
    cta: "Let's talk",
    href: "/contact",
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 text-white"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(251,146,60,0.08), rgba(168,85,247,0.10) 40%, rgba(59,130,246,0.08))",
            animation: "panGradient 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(99,102,241,0.05) 0px, rgba(99,102,241,0.05) 2px, transparent 2px, transparent 12px)",
          }}
        />
        <div className="absolute -top-32 right-1/4 h-64 w-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-orange-500 to-amber-600" />
        <div className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-violet-500 to-blue-600" />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 px-4 py-1.5 text-xs font-medium text-orange-300 ring-1 ring-orange-500/30 backdrop-blur mb-4">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 animate-pulse" />
            Simple, Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Investment in Your Story
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Every project is unique. These tiers give you a starting point — we'll craft a custom proposal once we understand your goals.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl p-7 sm:p-8 transition-all duration-300 ${
                tier.highlight
                  ? "bg-gradient-to-br from-violet-600/20 via-blue-600/15 to-cyan-600/10 ring-2 ring-violet-500/50 shadow-2xl shadow-violet-500/10"
                  : "bg-white/5 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/[0.07]"
              }`}
            >
              {/* Top shimmer line */}
              <div
                className={`absolute inset-x-0 top-0 h-px rounded-t-3xl ${
                  tier.highlight
                    ? "bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
                    : "bg-gradient-to-r from-transparent via-white/15 to-transparent"
                }`}
              />

              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-violet-500/30">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Tier name & tagline */}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
                  {tier.tagline}
                </p>
                <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-4">
                <span
                  className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                    tier.highlight
                      ? "bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent"
                      : "text-white"
                  }`}
                >
                  {tier.price}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-white/55 mb-7 leading-relaxed">
                {tier.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        tier.highlight
                          ? "bg-gradient-to-br from-violet-500/30 to-blue-500/30 ring-1 ring-violet-400/30"
                          : "bg-white/10 ring-1 ring-white/10"
                      }`}
                    >
                      <Check
                        size={11}
                        strokeWidth={2.5}
                        className={tier.highlight ? "text-violet-300" : "text-white/60"}
                      />
                    </span>
                    <span className="text-sm text-white/70 leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={tier.href}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  tier.highlight
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 hover:brightness-110"
                    : "bg-white/8 text-white ring-1 ring-white/15 hover:bg-white/15 hover:ring-white/25"
                }`}
              >
                {tier.cta}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-white/35">
          All prices are indicative. Final quotes are tailored to your project scope.{" "}
          <Link href="/contact" className="text-white/55 underline underline-offset-2 hover:text-white/80 transition">
            Talk to us
          </Link>{" "}
          for a custom proposal.
        </p>
      </div>
    </section>
  );
}
