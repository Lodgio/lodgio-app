import { indianMobileLocal } from "@/lib/phone";

export function IndianPhoneField({
  name,
  defaultValue,
  label,
  required,
  hint = "10-digit Indian mobile number.",
}: {
  name: string;
  defaultValue?: string | null;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      <div className="flex gap-2">
        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
          +91
        </span>
        <input
          name={name}
          required={required}
          inputMode="tel"
          autoComplete="tel-national"
          pattern="([6-9][0-9]{9}|-453380133)"
          maxLength={10}
          defaultValue={indianMobileLocal(defaultValue)}
          placeholder="9876543210"
          className="field"
        />
      </div>
    </div>
  );
}
