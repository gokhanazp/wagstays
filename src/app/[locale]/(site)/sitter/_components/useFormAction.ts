"use client";

import { startTransition, useActionState, useRef } from "react";
import type { SitterActionState } from "@/app/actions/sitter";

type Action = (s: SitterActionState, f: FormData) => Promise<SitterActionState>;

/**
 * useActionState wired through onSubmit instead of `action=` so React doesn't reset the form —
 * typed values survive a validation error. Pass `resetOnSuccess` for "add item" forms.
 */
export function useFormAction(fn: Action, { resetOnSuccess = false } = {}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(async (s: SitterActionState, f: FormData) => {
    const res = await fn(s, f);
    if (resetOnSuccess && res?.ok) form.current?.reset();
    return res;
  }, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { form, state, pending, onSubmit };
}
