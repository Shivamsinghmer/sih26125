"use client";

import { useActionState, useState } from "react";

import { IDLE, MAX_PHOTO_BYTES } from "@/lib/action-types";
import { addPersonAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Field, PillButton, Select } from "./ui";

const ROLE_OPTIONS = [
  { value: 3, label: "Manager" },
  { value: 2, label: "Auditor" },
  { value: 1, label: "User" },
  { value: 4, label: "Admin" },
  { value: 0, label: "No clearance yet" },
];

export function AddPersonPanel() {
  const [result, formAction, pending] = useActionState(addPersonAction, IDLE);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  /**
   * Checked here as well as on the server, because the server can only answer
   * after the whole file has been uploaded — and a photo straight off a phone
   * is big enough that somebody would sit and wait for a refusal. The server
   * still enforces it; this only saves the wait.
   */
  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhotoError(null);

    if (!file) {
      setPreview(null);
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPreview(null);
      event.target.value = "";
      setPhotoError(
        "That photo is too large. Please use one under 2MB — a phone photo usually needs shrinking first.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[70ch] text-body leading-body text-label">
        Their name, job title and photo are kept in the staff records here. What
        goes onto the shared record is only an ID &mdash; nothing that names
        them &mdash; which is what lets their details be deleted later if they
        ask. The photo is used for printing their ID card; the gate does not
        look it up.
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
              aria-describedby={photoError ? "photo-error" : undefined}
              className="text-caption leading-caption text-label file:mr-3 file:rounded-full file:border-0 file:bg-ink-black file:px-4 file:py-2 file:text-[13px] file:text-paper-white"
            />
          </div>
          {photoError ? (
            <p
              id="photo-error"
              role="alert"
              className="max-w-[42ch] text-caption leading-caption text-sienna-brown"
            >
              {photoError}
            </p>
          ) : null}
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

        <Field label="Job title">
          <input
            name="title"
            placeholder="Engineer, Radar Systems"
            className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
          />
        </Field>

        <Field label="Starting clearance">
          <Select name="role" defaultValue={1}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Lasts for">
          <Select name="days" defaultValue={30}>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </Select>
        </Field>

        <PillButton type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add person"}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
