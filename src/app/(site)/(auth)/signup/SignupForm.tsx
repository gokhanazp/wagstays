"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

const ROLES = [
  { value: "OWNER", icon: "pets", title: "I'm a Pet Parent", text: "Find and book sitters" },
  { value: "SITTER", icon: "volunteer_activism", title: "I'm a Sitter", text: "Care for pets & earn" },
] as const;

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("OWNER");
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="next" type="hidden" value={role === "SITTER" && next === "/" ? "/become-a-sitter" : next} />
      <input name="role" type="hidden" value={role} />
      <div className="grid grid-cols-2 gap-space-sm">
        {ROLES.map((r) => (
          <button
            key={r.value}
            aria-pressed={role === r.value}
            className={`p-space-md rounded-2xl text-left flex flex-col gap-1 border transition-all ${
              role === r.value
                ? "bg-primary text-on-primary border-primary shadow-sm"
                : "bg-surface-container-low text-on-surface border-surface-container-high hover:bg-surface-container"
            }`}
            onClick={() => setRole(r.value)}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">{r.icon}</span>
            <span className="font-label-lg text-label-lg">{r.title}</span>
            <span className={`font-body-sm text-body-sm ${role === r.value ? "text-on-primary/80" : "text-on-surface-variant"}`}>{r.text}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <label className="flex flex-col gap-space-xs">
          <span className={LABEL}>First name</span>
          <input autoComplete="given-name" className={INPUT} name="firstName" placeholder="Emily" />
          <FieldError messages={state?.fieldErrors?.firstName} />
        </label>
        <label className="flex flex-col gap-space-xs">
          <span className={LABEL}>Last name</span>
          <input autoComplete="family-name" className={INPUT} name="lastName" placeholder="Young" />
          <FieldError messages={state?.fieldErrors?.lastName} />
        </label>
      </div>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Email</span>
        <input autoComplete="email" className={INPUT} name="email" placeholder="you@example.com" type="email" />
        <FieldError messages={state?.fieldErrors?.email} />
      </label>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Password</span>
        <input autoComplete="new-password" className={INPUT} name="password" placeholder="At least 8 characters" type="password" />
        <FieldError messages={state?.fieldErrors?.password} />
      </label>
      <button className={PRIMARY_BTN} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">pets</span>
        {pending ? "Creating account…" : "Create my account"}
      </button>
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        Already have an account?{" "}
        <Link className="font-label-lg text-label-lg text-primary hover:underline" href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
          Log in
        </Link>
      </p>
      <p className="font-body-sm text-body-sm text-outline text-center">
        By creating an account you agree to our Terms of Service and PIPEDA Privacy Notice.
      </p>
    </form>
  );
}
