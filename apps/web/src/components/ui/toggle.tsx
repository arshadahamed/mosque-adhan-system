"use client";
import { useState } from "react";

interface YesNoToggleProps {
  value: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
}

export function YesNoToggle({ value, onChange, readOnly = false }: YesNoToggleProps) {
  const handleClick = () => {
    if (!readOnly && onChange) onChange(!value);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={readOnly}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white transition-colors ${
        value ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
      } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
    >
      {value ? "Yes" : "No"}
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
    <div>
      <div className="flex items-center gap-2">
        <YesNoToggle value={checked} onChange={onChange} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      {description && <p className="text-xs text-muted-foreground mt-1 ml-10">{description}</p>}
    </div>
  );
}
