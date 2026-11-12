import { StatusChip } from "@/components/ui";
import { ROLE_LABEL, ROLE_TONE, roleKeys } from "./roles";

export function RoleChips({ role, isAdmin, petCount }: { role: string; isAdmin: boolean; petCount?: number }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roleKeys({ role, isAdmin, petCount }).map((k) => (
        <StatusChip key={k} tone={ROLE_TONE[k]}>
          {ROLE_LABEL[k]}
        </StatusChip>
      ))}
    </span>
  );
}
