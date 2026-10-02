"use client";

import { useEffect, useState } from "react";

type Photo = { id: string; url: string; caption: string | null };

const img = "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500";
const TILES = 4;

export function PhotoGallery({ photos, totalCount, name }: { photos: Photo[]; totalCount: number; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const extra = totalCount - TILES;
  const [main, second, third, fourth] = photos;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos.length]);

  if (!main) return null;
  const alt = (p: Photo) => p.caption?.replace(/\s*🐾\s*$/, "") || `Photo from ${name}'s profile`;
  const hasStack = !!second;

  return (
    <>
      <div className="grid grid-cols-12 sm:grid-rows-1 gap-3 sm:h-[380px] rounded-3xl overflow-hidden shadow-sm">
        <button
          className={`${hasStack ? "col-span-12 sm:col-span-7" : "col-span-12"} h-64 sm:h-full min-h-0 relative group overflow-hidden text-left`}
          onClick={() => setOpen(0)}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={alt(main)} className={img} src={main.url} />
          {main.caption && (
            <div className="absolute inset-0 bg-gradient-to-t from-on-background/60 via-transparent to-transparent flex items-end p-4">
              <span className="bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-full font-label-sm text-label-sm text-on-surface shadow-sm">
                {main.caption}
              </span>
            </div>
          )}
        </button>
        {hasStack && (
          <div className={`col-span-12 sm:col-span-5 grid ${third ? "grid-rows-2" : "grid-rows-1"} gap-3 h-72 sm:h-full`}>
            <button className="relative group overflow-hidden rounded-2xl text-left h-full min-h-0" onClick={() => setOpen(1)} type="button">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={alt(second)} className={img} src={second.url} />
              {second.caption && (
                <span className="absolute bottom-2 left-2 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-full font-label-sm text-label-sm text-on-surface">
                  {second.caption}
                </span>
              )}
            </button>
            {third && (
              <div className={`grid ${fourth ? "grid-cols-2" : "grid-cols-1"} gap-3 min-h-0`}>
                <button className="relative group overflow-hidden rounded-2xl text-left h-full min-h-0" onClick={() => setOpen(2)} type="button">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={alt(third)} className={img} src={third.url} />
                  {third.caption && (
                    <span className="absolute bottom-2 left-2 bg-surface-container-lowest/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-on-surface">
                      {third.caption}
                    </span>
                  )}
                </button>
                {fourth && (
                  <button className="relative group overflow-hidden rounded-2xl h-full min-h-0" onClick={() => setOpen(3)} type="button">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={alt(fourth)} className={img} src={fourth.url} />
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center hover:bg-primary/10 transition-colors cursor-pointer">
                      <span className="bg-surface-container-lowest px-3 py-1.5 rounded-full font-label-sm text-label-sm text-primary font-bold shadow-md">
                        {extra > 0 ? `+${extra} Photos` : "View All Photos"}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {open !== null && photos[open] && (
        <div
          aria-label={`${name}'s photos`}
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-on-background/90 flex flex-col items-center justify-center p-4 sm:p-10"
          onClick={() => setOpen(null)}
          role="dialog"
        >
          <button
            aria-label="Close"
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-surface-container-lowest/90 text-on-surface flex items-center justify-center hover:bg-surface-container-lowest"
            onClick={() => setOpen(null)}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="relative w-full max-w-5xl flex-1 min-h-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={alt(photos[open])} className="max-w-full max-h-full rounded-2xl object-contain shadow-xl" src={photos[open].url} />
            {photos.length > 1 && (
              <>
                <button
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface-container-lowest/90 text-on-surface flex items-center justify-center"
                  onClick={() => setOpen((open - 1 + photos.length) % photos.length)}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface-container-lowest/90 text-on-surface flex items-center justify-center"
                  onClick={() => setOpen((open + 1) % photos.length)}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 font-label-md text-label-md text-surface-container-lowest" onClick={(e) => e.stopPropagation()}>
            {photos[open].caption && <span>{photos[open].caption}</span>}
            <span className="opacity-70">
              {open + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
