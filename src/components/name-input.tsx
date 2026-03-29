"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  suggestions: string[];
  defaultValue?: string;
}

export function NameInput({ id, name, placeholder, required, suggestions, defaultValue = "" }: Props) {
  const [value, setValue]     = React.useState(defaultValue);
  const [open, setOpen]       = React.useState(false);
  const [activeIdx, setActive] = React.useState(-1);
  const containerRef          = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    if (!value.trim()) return [];
    const q = value.toLowerCase();
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 5);
  }, [value, suggestions]);

  const showDropdown = open && filtered.length > 0;

  function select(s: string) {
    setValue(s);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  // Close when clicking outside
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          {filtered.map((s, i) => (
            <li
              key={s}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer select-none",
                i === activeIdx
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click registers
                select(s);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
