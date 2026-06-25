"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionSectionProps {
  title: string;
  required?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({ title, required, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-800">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-zinc-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-zinc-100">
          {children}
        </div>
      )}
    </div>
  );
}
