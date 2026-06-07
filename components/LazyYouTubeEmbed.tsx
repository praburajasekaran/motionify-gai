import { useState } from 'react';

interface LazyYouTubeEmbedProps {
  videoId: string;
  title: string;
  className?: string;
}

export default function LazyYouTubeEmbed({ videoId, title, className = '' }: LazyYouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1`;
  const thumbnailSrc = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg bg-gray-950 ring-1 ring-white/10 ${className}`}>
      {isLoaded ? (
        <iframe
          src={embedSrc}
          title={title}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsLoaded(true)}
          className="group relative h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          aria-label={`Play ${title}`}
        >
          <img
            src={thumbnailSrc}
            alt=""
            className="h-full w-full object-cover opacity-80 transition duration-200 group-hover:scale-[1.02] group-hover:opacity-95"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-gray-950 shadow-xl transition duration-200 group-hover:bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
