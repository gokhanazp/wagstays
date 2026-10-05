/** Round avatar with an initial fallback (owners often have no photo). */
export function Avatar({ src, initial, alt, size = "md" }: { src: string | null; initial: string; alt: string; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "w-9 h-9 text-label-md", md: "w-11 h-11 text-title-md", lg: "w-14 h-14 text-headline-sm" }[size];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars come from seed URLs / uploads
    return <img alt={alt} className={`${box} rounded-full object-cover shrink-0 bg-surface-container`} src={src} />;
  }
  return (
    <span aria-label={alt} className={`${box} rounded-full shrink-0 bg-primary-fixed text-on-primary-fixed-variant font-title-md flex items-center justify-center uppercase`} role="img">
      {initial}
    </span>
  );
}
