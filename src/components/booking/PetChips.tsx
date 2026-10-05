// Pet chips (photo + name) for the pets of a booking — owner, sitter and admin booking pages.

import { Link } from "@/i18n/navigation";

type ChipPet = { id: string; name: string; photoUrl?: string | null; breed?: string | null; href?: string };

export function PetChips({ pets, className = "" }: { pets: ChipPet[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-space-xs ${className}`} data-testid="pet-chips">
      {pets.map((p) => {
        const body = (
          <>
            <span className="w-7 h-7 rounded-full overflow-hidden bg-primary-fixed flex items-center justify-center shrink-0">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="w-full h-full object-cover" src={p.photoUrl} />
              ) : (
                <span className="material-symbols-outlined text-primary text-base">pets</span>
              )}
            </span>
            <span className="truncate">
              <span className="font-semibold text-on-surface">{p.name}</span>
              {p.breed && <span className="text-on-surface-variant"> · {p.breed}</span>}
            </span>
          </>
        );
        const cls = "h-9 pl-1 pr-space-sm rounded-full bg-surface-container-low flex items-center gap-space-xs font-label-md text-label-md max-w-full";
        return (
          <li className="max-w-full min-w-0" key={p.id}>
            {p.href ? (
              <Link className={`${cls} hover:bg-surface-container transition-colors`} href={p.href}>
                {body}
              </Link>
            ) : (
              <span className={cls}>{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
