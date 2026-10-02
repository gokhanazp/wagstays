"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="next" type="hidden" value={next} />
      {state?.error && (
        <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-lg">info</span>
          {state.error}
        </div>
      )}
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Email</span>
        <input autoComplete="email" className={INPUT} name="email" placeholder="you@example.com" type="email" />
        <FieldError messages={state?.fieldErrors?.email} />
      </label>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Password</span>
        <input autoComplete="current-password" className={INPUT} name="password" placeholder="••••••••" type="password" />
        <FieldError messages={state?.fieldErrors?.password} />
      </label>
      <p className="-mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
        Forgot your password? Email <a className="text-primary hover:underline" href="mailto:support@wagstays.ca">support@wagstays.ca</a> and we&apos;ll send you a reset link.
      </p>
      <button className={PRIMARY_BTN} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">login</span>
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        New to WagStays?{" "}
        <Link className="font-label-lg text-label-lg text-primary hover:underline" href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
          Create an account
        </Link>
      </p>
      <p className="font-body-sm text-body-sm text-outline text-center">Demo account: emily@wagstays.ca · wagstays123</p>
    </form>
  );
}
