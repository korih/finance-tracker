"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMonthlyBudget } from "@/app/actions/budgets";

interface Props {
  spreadsheetId: string;
  current: number;
}

export function BudgetTotalEditor({ spreadsheetId, current }: Props) {
  const [editing, setEditing] = useState(current === 0);
  const [value, setValue] = useState(current > 0 ? String(current) : "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const amount = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (isNaN(amount) || amount < 0) { setEditing(false); return; }
    const fd = new FormData();
    fd.set("spreadsheetId", spreadsheetId);
    fd.set("amount", String(amount));
    startTransition(async () => {
      await setMonthlyBudget(fd);
      setEditing(false);
    });
  }

  function cancel() {
    setValue(current > 0 ? String(current) : "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 justify-center">
        <span className="text-2xl font-semibold text-muted-foreground">$</span>
        <Input
          ref={inputRef}
          autoFocus
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="w-36 text-2xl font-semibold text-center tabular-nums h-10 bg-muted/50"
          placeholder="0.00"
          disabled={pending}
        />
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-accent2 hover:text-accent2" onClick={save} disabled={pending}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={cancel} disabled={pending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-center group">
      <span
        className="text-4xl font-bold tabular-nums cursor-pointer"
        style={{ color: "var(--accent)" }}
        onClick={() => { setValue(String(current)); setEditing(true); }}
      >
        ${current.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground"
        onClick={() => { setValue(String(current)); setEditing(true); }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
