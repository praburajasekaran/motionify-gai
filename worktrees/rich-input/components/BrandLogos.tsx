export default function BrandLogos() {
  const brands = [
    { name: "Leminar", src: "/client-logos/leminar-3-300x86.png", width: 300, height: 86, alt: "Leminar logo" },
    { name: "IJM", src: "/client-logos/ijm-1-300x86.png", width: 300, height: 86, alt: "IJM logo" },
    { name: "TVS Credit", src: "/client-logos/tvs-credit-1-300x86.png", width: 300, height: 86, alt: "TVS Credit logo" },
    { name: "ReNfra Energy", src: "/client-logos/renfra-2-300x86.png", width: 300, height: 86, alt: "ReNfra Energy logo" },
    { name: "Maersk Tankers", src: "/client-logos/maersk-tankers-300x86.png", width: 300, height: 86, alt: "Maersk Tankers logo" },
    { name: "Decathlon", src: "/client-logos/decathlon-1-300x86.png", width: 300, height: 86, alt: "Decathlon logo" },
    { name: "Medis", src: "/client-logos/medis-2-300x86.png", width: 300, height: 86, alt: "Medis logo" },
    { name: "Fitch Learning", src: "/client-logos/fitch-learning-1-300x86.png", width: 300, height: 86, alt: "Fitch Learning logo" },
    { name: "Speed Team", src: "/client-logos/speed-team-5-300x86.png", width: 300, height: 86, alt: "Speed Team logo" },
    { name: "I-Dair", src: "/client-logos/i-dair-1.png", width: 300, height: 86, alt: "I-Dair logo" },
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Brands We Collaborate With
          </h2>
          <p className="mt-3 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            Trusted by industry leaders across the globe
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 items-center justify-items-center">
          {brands.map((brand, index) => (
            <div
              key={index}
              className="group relative flex items-center justify-center w-full h-20 sm:h-24 rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-all duration-300 backdrop-blur"
            >
              <img
                src={brand.src}
                alt={brand.alt}
                width={brand.width}
                height={brand.height}
                className="max-h-12 sm:max-h-14 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        
      </div>
    </section>
  );
}
