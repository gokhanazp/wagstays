"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addNeighbourhood, deleteNeighbourhood, renameNeighbourhood, type FormState } from "@/app/actions/admin-core";
import { BTN, Field, INPUT } from "@/components/ui";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { FormStatus } from "../../_components/FormStatus";
import { keepValuesOnSubmit } from "../../_components/form-utils";

type Hood = { id: string; name: string; slug: string; sitters: number };

function HoodRow({ hood }: { hood: Hood }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await renameNeighbourhood(prev, fd);
    if (res?.ok) setEditing(false);
    return res;
  }, undefined);

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-space-sm px-space-md py-space-sm rounded-xl hover:bg-surface-container-low">
      {editing ? (
        <form onSubmit={keepValuesOnSubmit(action)} className="flex flex-1 flex-wrap items-center gap-space-sm">
          <input name="id" type="hidden" value={hood.id} />
          <input aria-label="Neighbourhood name" autoFocus className={`${INPUT} h-10 flex-1 min-w-[180px]`} defaultValue={hood.name} name="name" required />
          <button className={`${BTN.small} bg-primary text-on-primary`} disabled={pending} type="submit">
            {pending ? "Saving…" : "Save"}
          </button>
          <button className={`${BTN.small} hover:bg-surface-container`} onClick={() => setEditing(false)} type="button">
            Cancel
          </button>
          {state?.error && <span className="w-full font-body-sm text-body-sm text-error">{state.error}</span>}
        </form>
      ) : (
        <>
          <span className="flex-1 flex flex-col min-w-0">
            <span className="font-label-lg text-label-lg text-on-surface">{hood.name}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              /{hood.slug} · {hood.sitters} sitter{hood.sitters === 1 ? "" : "s"}
            </span>
          </span>
          <span className="flex items-center gap-space-xs">
            <button className={`${BTN.small} text-primary hover:bg-surface-container`} onClick={() => setEditing(true)} type="button">
              <span className="material-symbols-outlined text-base">edit</span>Rename
            </button>
            <ConfirmButton
              action={deleteNeighbourhood.bind(null, hood.id)}
              className={`${BTN.small} text-error hover:bg-error-container disabled:hover:bg-transparent`}
              confirm={{ title: `Delete ${hood.name}?`, body: "This removes the neighbourhood from the city. It can't be undone.", confirmLabel: "Delete", danger: true }}
              disabled={hood.sitters > 0}
              disabledReason="Sitters are assigned to this neighbourhood — move them first."
              icon="delete"
              label="Delete"
            />
          </span>
        </>
      )}
    </li>
  );
}

export function Neighbourhoods({ cityId, hoods }: { cityId: string; hoods: Hood[] }) {
  const [state, action, pending] = useActionState(addNeighbourhood, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const fe = state?.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-space-md">
      {hoods.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant px-space-md">No neighbourhoods yet — add at least one before activating the city.</p>
      ) : (
        <ul className="flex flex-col">{hoods.map((h) => <HoodRow key={h.id} hood={h} />)}</ul>
      )}
      <form ref={formRef} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-space-md p-space-md rounded-2xl bg-surface-container-low">
        <input name="cityId" type="hidden" value={cityId} />
        <span className="flex flex-col">
          <span className="font-label-lg text-label-lg text-on-surface">Add a neighbourhood</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Coordinates are optional — they default to the city centre.</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px] gap-space-md">
          <Field error={fe.name} label="Name">
            <input className={INPUT} name="name" placeholder="e.g. Leslieville" required />
          </Field>
          <Field error={fe.lat} label="Latitude">
            <input className={INPUT} inputMode="decimal" name="lat" type="text" />
          </Field>
          <Field error={fe.lng} label="Longitude">
            <input className={INPUT} inputMode="decimal" name="lng" type="text" />
          </Field>
        </div>
        <FormStatus state={state} />
        <div>
          <button className={BTN.sage} disabled={pending} type="submit">
            <span className="material-symbols-outlined text-xl">add_location_alt</span>
            {pending ? "Adding…" : "Add neighbourhood"}
          </button>
        </div>
      </form>
    </div>
  );
}
