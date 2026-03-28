"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editRecurringRule } from "@/app/actions/recurring";
import type { RecurringRule } from "@/lib/recurring";
import { INCOME_TYPE_LABELS } from "@/lib/income";

export function EditRecurringIncomeButton({
  rule,
  spreadsheetId,
}: {
  rule: RecurringRule;
  spreadsheetId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [recurrenceType, setRecurrenceType] = React.useState(rule.recurrence_type);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setRecurrenceType(rule.recurrence_type);
      setError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", String(rule.id));
    fd.set("spreadsheetId", spreadsheetId);
    fd.set("entry_type", "income");
    setPending(true);
    try {
      await editRecurringRule(fd);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Edit recurring rule"
      >
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Income</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Only future entries will be affected. Past entries are unchanged.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="eri-source">Source</Label>
            <Input
              id="eri-source"
              name="source"
              defaultValue={rule.income_source ?? ""}
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eri-type">Type</Label>
            <select
              id="eri-type"
              name="type"
              defaultValue={rule.income_type ?? "income"}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eri-amount">Amount ($)</Label>
            <Input
              id="eri-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={rule.amount}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eri-recurrence">Recurrence</Label>
            <select
              id="eri-recurrence"
              name="recurrence_type"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as typeof recurrenceType)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom (every N days)</option>
            </select>
          </div>

          {recurrenceType === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="eri-days">Every N days</Label>
              <Input
                id="eri-days"
                name="recurrence_days"
                type="number"
                min="1"
                defaultValue={rule.recurrence_days ?? 30}
                required
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={buttonVariants()} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
