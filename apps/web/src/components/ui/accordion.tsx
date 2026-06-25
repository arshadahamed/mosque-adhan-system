"use client";
import { useState } from "react";

interface AccordionSectionProps {
  title: string;
  required?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({ title, required, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium bg-[#ddd6f8] hover:bg-[#ccc4f0] transition-colors"
      >
        <span>
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 bg-white border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
