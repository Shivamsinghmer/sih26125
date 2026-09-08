"use client";

import { useActionState, useState } from "react";

import { IDLE } from "@/lib/action-types";
import { addPersonAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Field, PillButton, Select } from "./ui";

const ROLE_OPTIONS = [
  { value: 3, label: "Manager" },
  { value: 2, label: "Auditor" },
  { value: 1, label: "User" },
  { value: 4, label: "Admin" },
  { value: 0, label: "No role yet" },
];

export function AddPersonPanel() {
  const [result, formAction, pending] = useActionState(addPersonAction, IDLE);
  const [preview, setPreview] = useState<string | null>(null);

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[70ch] text-body leading-body text-label">
        Onboarding writes the name, title and photo to Postgres and a
        decentralised identity to the chain. Nothing identifying a person
        reaches the chain — only a DID, a public key and a status flag — which
        is what makes an erasure request answerable later. The photo exists so
        an ID card can be printed; nothing in the system looks it up at a gate.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <Field label="Photo">
          <div className="flex items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="h-14 w-14 rounded-xl object-cover"
                style={{ boxShadow: "var(--shadow-subtle)" }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-mist-gray text-caption text-subtle">
                none
              </div>
            )}
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={onPhotoChange}
              className="text-caption leading-caption text-label file:mr-3 file:rounded-full file:border-0 file:bg-ink-black file:px-4 file:py-2 file:text-[13px] file:text-paper-white"
            />
          </div>
        </Field>

        <Field label="Name">
          <input
            name="name"
            required
            minLength={2}
            placeholder="A. Krishnan"
            className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
          />
        </Field>

        <Field label="Title">
          <input
            name="title"
            placeholder="Engineer, Radar Systems"
            className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
          />
        </Field>

        <Field label="Initial role">
          <Select name="role" defaultValue={1}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Valid for">
          <Select name="days" defaultValue={30}>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </Select>
        </Field>

        <PillButton type="submit" disabled={pending}>
          {pending ? "Onboarding…" : "Add person"}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
