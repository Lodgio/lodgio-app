"use client";

import { useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600;

function isHeic(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type.includes("heic") || type.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
}

/** Shrink phone photos before the form POST. Vercel drops request bodies over ~4.5 MB. */
async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || isHeic(file)) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) return file;
  const next = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  return next.size < file.size ? next : file;
}

export function GuestIdFileField() {
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setNote(null);
    setProblem(null);
    if (!file) return;

    try {
      const next = await shrinkPhoto(file);
      if (next !== file) {
        const data = new DataTransfer();
        data.items.add(next);
        input.files = data.files;
        setNote("Photo prepared for upload.");
      }
      const ready = input.files?.[0];
      if (ready && ready.size > MAX_BYTES) {
        input.value = "";
        setProblem("That file is too large. Take a photo of the ID, or send a JPEG under 4 MB.");
      }
    } catch {
      if (file.size > MAX_BYTES) {
        input.value = "";
        setProblem("That file is too large. Take a photo of the ID, or send a JPEG under 4 MB.");
      }
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-800">Photo or PDF of your ID</label>
      <p className="text-xs leading-relaxed text-zinc-500">
        Required. A photo is resized on your phone before it is sent. PDF or iPhone HEIC up to 4 MB.
      </p>
      <input
        name="idDocument"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif"
        className="field file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-zinc-700"
        onChange={onChange}
      />
      {note ? <p className="text-xs text-zinc-500">{note}</p> : null}
      {problem ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{problem}</p>
      ) : null}
    </div>
  );
}
