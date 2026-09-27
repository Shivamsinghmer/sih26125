"use client";

import { useActionState, useState } from "react";

import { IDLE, MAX_PHOTO_BYTES } from "@/lib/action-types";
import { addPersonAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ROLE_OPTIONS = [
  { value: 3, label: "Secret" },
  { value: 2, label: "Confidential" },
  { value: 1, label: "Restricted" },
  { value: 4, label: "Top Secret" },
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
      <form action={formAction} className="grid gap-x-4 gap-y-5 rounded-3xl bg-mist-gray p-5 sm:grid-cols-2 md:p-6">
        <Field label="Photo" className="sm:col-span-2">
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-black/15 bg-paper-white p-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="size-16 rounded-xl object-cover ring-1 ring-black/5"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-mist-gray text-label">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="9" r="3.5" />
                  <path d="M5.5 19.5c1-3.2 3.6-5 6.5-5s5.5 1.8 6.5 5" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={onPhotoChange}
                aria-describedby={photoError ? "photo-error" : "photo-hint"}
                className="max-w-full text-caption leading-caption text-label file:mr-3 file:h-9 file:cursor-pointer file:rounded-full file:border file:border-ink-black file:bg-transparent file:px-4 file:text-[14px] file:text-ink-black hover:file:bg-mist-gray"
              />
              <p id="photo-hint" className="mt-1.5 text-[13px] leading-snug text-label">
                For the printed ID card only. Under 2MB.
              </p>
            </div>
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
          <Input name="name" required minLength={2} placeholder="A. Krishnan" />
        </Field>

        <Field label="Job title">
          <Input name="title" placeholder="Engineer, Radar Systems" />
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

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/[0.06] pt-5 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add person"}
          </Button>
        </div>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
