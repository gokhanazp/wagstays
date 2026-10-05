/* eslint-disable @next/next/no-img-element -- plain <img> matches the site's object-cover thumbnails */

/** Pet photo, or a paw placeholder when the owner hasn't added one. */
export function PetPhoto({ url, name, className }: { url: string | null; name: string; className: string }) {
  if (url) return <img alt={name} className={`object-cover bg-surface-container-high shrink-0 ${className}`} src={url} />;
  return (
    <span aria-label={name} className={`flex items-center justify-center bg-primary-fixed text-primary shrink-0 ${className}`} role="img">
      <span className="material-symbols-outlined text-2xl">pets</span>
    </span>
  );
}
