"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateTransaction } from "@/app/actions/transactions";
import type { TransactionRow } from "@/lib/db";

function parseLocalDate(raw: string): Date {
  const str = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const d = new Date(str);
  if (isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

export function EditTransactionButton({
  row,
  spreadsheetId,
}: {
  row: TransactionRow;
  spreadsheetId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(() => parseLocalDate(row.timestamp));
  const [calOpen, setCalOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Reset state when dialog reopens
  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(parseLocalDate(row.timestamp));
      setError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", String(row.id));
    fd.set("spreadsheetId", spreadsheetId);
    fd.set("timestamp", dateStr);
    setPending(true);
    try {
      await updateTransaction(fd);
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
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="et-merchant">Merchant</Label>
            <Input
              id="et-merchant"
              name="merchant"
              defaultValue={row.merchant}
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="et-amount">Amount ($)</Label>
            <Input
              id="et-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={row.amount}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start text-left font-normal")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
                      setCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="et-card">Card</Label>
            <Input
              id="et-card"
              name="card"
              defaultValue={row.card}
              required
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={buttonVariants({ variant: "outline" })} onClick={() => setOpen(false)}>
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
