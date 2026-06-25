"use client";

interface YesNoToggleProps {
  value: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
}

export function YesNoToggle({ value, onChange, readOnly = false }: YesNoToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={readOnly}
      onClick={() => !readOnly && onChange?.(!value)}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-default ${
        value ? "bg-violet-600" : "bg-zinc-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <YesNoToggle value={checked} onChange={onChange} />
      <div>
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
