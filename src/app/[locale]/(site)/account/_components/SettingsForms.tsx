"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useRef } from "react";
import { changeEmail, changePassword, updateProfile, type FormState } from "@/app/actions/account";
import { BTN, Card, CardHeader, Field, INPUT } from "@/components/ui";
import { ImagePicker } from "./ImagePicker";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/** useActionState wrapper that keeps typed values on validation errors and optionally clears on success. */
function useForm(fn: Action, clearOnSuccess = false) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const res = await fn(prev, fd);
    if (res?.ok && clearOnSuccess) ref.current?.reset();
    return res;
  }, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  return { ref, state, pending, onSubmit };
}

function Feedback({ state }: { state: FormState }) {
  if (state?.ok)
    return (
      <p className="flex items-center gap-1 font-label-lg text-label-lg text-primary" role="status">
        <span className="material-symbols-outlined text-lg">check_circle</span>
        {state.message}
      </p>
    );
  if (state?.error)
    return (
      <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
        <span className="material-symbols-outlined text-base">error</span>
        {state.error}
      </p>
    );
  return null;
}

function Submit({ pending, label, icon }: { pending: boolean; label: string; icon: string }) {
  const tc = useTranslations("common.actions");
  return (
    <button className={BTN.primary} disabled={pending} type="submit">
      <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : icon}</span>
      {pending ? tc("saving") : label}
    </button>
  );
}

export function ProfileForm({ user }: { user: { firstName: string; lastName: string; phone: string | null; avatarUrl: string | null } }) {
  const { ref, state, pending, onSubmit } = useForm(updateProfile);
  const t = useTranslations("account.settings.profile");
  const fe = state?.fieldErrors ?? {};
  return (
    <Card className="pb-space-lg">
      <CardHeader icon="person" title={t("title")} />
      <form className="px-space-lg pt-space-md flex flex-col gap-space-md" noValidate onSubmit={onSubmit} ref={ref}>
        <ImagePicker error={fe.avatar?.[0]} fallbackIcon="person" initialUrl={user.avatarUrl} label={t("photo")} name="avatar" removeName="removeAvatar" shape="circle" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Field error={fe.firstName} label={t("firstName")}>
            <input autoComplete="given-name" className={INPUT} defaultValue={user.firstName} maxLength={40} name="firstName" />
          </Field>
          <Field error={fe.lastName} label={t("lastName")}>
            <input autoComplete="family-name" className={INPUT} defaultValue={user.lastName} maxLength={40} name="lastName" />
          </Field>
        </div>
        <Field error={fe.phone} hint={t("phoneHint")} label={t("phone")}>
          <input autoComplete="tel" className={INPUT} defaultValue={user.phone ?? ""} inputMode="tel" maxLength={25} name="phone" placeholder="+1 (416) 555-0119" type="tel" />
        </Field>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-space-sm">
          <Feedback state={state} />
          <span className="sm:ml-auto">
            <Submit icon="save" label={t("save")} pending={pending} />
          </span>
        </div>
      </form>
    </Card>
  );
}

export function EmailForm({ email }: { email: string }) {
  const { ref, state, pending, onSubmit } = useForm(changeEmail, true);
  const t = useTranslations("account.settings.email");
  const fe = state?.fieldErrors ?? {};
  return (
    <Card className="pb-space-lg">
      <CardHeader icon="alternate_email" title={t("title")} />
      <form className="px-space-lg pt-space-md flex flex-col gap-space-md" noValidate onSubmit={onSubmit} ref={ref}>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {t.rich("current", { email, b: (c) => <strong className="text-on-surface break-all">{c}</strong> })}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Field error={fe.email} label={t("new")}>
            <input autoComplete="email" className={INPUT} name="email" placeholder="you@example.ca" type="email" />
          </Field>
          <Field error={fe.currentPassword} label={t("currentPassword")}>
            <input autoComplete="current-password" className={INPUT} name="currentPassword" type="password" />
          </Field>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-space-sm">
          <Feedback state={state} />
          <span className="sm:ml-auto">
            <Submit icon="mail" label={t("update")} pending={pending} />
          </span>
        </div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const { ref, state, pending, onSubmit } = useForm(changePassword, true);
  const t = useTranslations("account.settings");
  const fe = state?.fieldErrors ?? {};
  return (
    <Card className="pb-space-lg">
      <CardHeader icon="lock" title={t("password.title")} />
      <form className="px-space-lg pt-space-md flex flex-col gap-space-md" noValidate onSubmit={onSubmit} ref={ref}>
        <Field error={fe.currentPassword} label={t("email.currentPassword")}>
          <input autoComplete="current-password" className={INPUT} name="currentPassword" type="password" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Field error={fe.newPassword} hint={t("password.newHint")} label={t("password.new")}>
            <input autoComplete="new-password" className={INPUT} name="newPassword" type="password" />
          </Field>
          <Field error={fe.confirmPassword} label={t("password.confirm")}>
            <input autoComplete="new-password" className={INPUT} name="confirmPassword" type="password" />
          </Field>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-space-sm">
          <Feedback state={state} />
          <span className="sm:ml-auto">
            <Submit icon="key" label={t("password.change")} pending={pending} />
          </span>
        </div>
      </form>
    </Card>
  );
}
