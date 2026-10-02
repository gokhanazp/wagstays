import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler for useActionState forms that must keep the user's input after a
 * validation error (React resets uncontrolled fields when a form uses the `action` prop).
 */
export function keepValuesOnSubmit(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(fd));
  };
}
