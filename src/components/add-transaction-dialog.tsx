"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { addTransaction } from "@/app/actions/transactions";
import { addRecurringExpense } from "@/app/actions/recurring";
import { NameInput } from "@/components/name-input";

const NEW_CARD_VALUE = "__new__";

type RecurrenceType = "daily" | "weekly" | "monthly" | "custom";

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "daily",   label: "Daily"   },
  { value: "weekly",  label: "Weekly"  },
  { value: "monthly", label: "Monthly" },
  { value: "custom",  label: "Custom (every N days)" },
];

interface Props {
  spreadsheetId: string;
  existingCards: string[];
  existingMerchants: string[];
}

export function AddTransactionDialog({ spreadsheetId, existingCards, existingMerchants }: Props) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(new Date());
  const [calOpen, setCalOpen] = React.useState(false);
  const [selectedCard, setSelectedCard] = React.useState<string>("");
  const [newCard, setNewCard] = React.useState("");
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>("monthly");
  const [recurrenceDays, setRecurrenceDays] = React.useState("30");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isNewCard = selectedCard === NEW_CARD_VALUE;
  const resolvedCard = isNewCard ? newCard.trim() : selectedCard;

  // YYYY-MM-DD in local time
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!resolvedCard) {
      setError("Please select or enter a card.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("timestamp", dateStr);
    fd.set("card", resolvedCard);
    fd.set("spreadsheetId", spreadsheetId);

    setPending(true);
    try {
      if (isRecurring) {
        fd.set("recurrence_type", recurrenceType);
        if (recurrenceType === "custom") fd.set("recurrence_days", recurrenceDays);
        await addRecurringExpense(fd);
      } else {
        await addTransaction(fd);
      }
      setOpen(false);
      setDate(new Date());
      setSelectedCard("");
      setNewCard("");
      setIsRecurring(false);
      setRecurrenceType("monthly");
      setRecurrenceDays("30");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI triggers don't support asChild — apply button classes directly */}
      <DialogTrigger className={buttonVariants({ size: "sm" })}>
        + Add Expense
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Merchant */}
          <div className="space-y-1.5">
            <Label htmlFor="merchant">Merchant</Label>
            <NameInput
              id="merchant"
              name="merchant"
              placeholder="e.g. Whole Foods"
              required
              suggestions={existingMerchants}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start text-left font-normal"
                )}
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
                      // Normalize to local noon to prevent UTC-midnight cross-date shift
                      setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
                      setCalOpen(false);
                    }
                  }}
                  disabled={(d) => d > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Card */}
          <div className="space-y-1.5">
            <Label>Card</Label>
            <Select
              value={selectedCard}
              onValueChange={(value) => setSelectedCard(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a card…" />
              </SelectTrigger>
              <SelectContent>
                {existingCards.map((card) => (
                  <SelectItem key={card} value={card}>
                    {card}
                  </SelectItem>
                ))}
                {existingCards.length > 0 && <SelectSeparator />}
                <SelectItem value={NEW_CARD_VALUE}>+ New card…</SelectItem>
              </SelectContent>
            </Select>

            {isNewCard && (
              <Input
                placeholder="Card name"
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Recurring */}
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <span className="text-sm font-medium">Recurring expense</span>
            </label>

            {isRecurring && (
              <div className="pl-6 space-y-2">
                <Label>Repeats</Label>
                <Select
                  value={recurrenceType}
                  onValueChange={(v) => setRecurrenceType((v ?? "monthly") as RecurrenceType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {recurrenceType === "custom" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">Every</span>
                    <Input
                      type="number"
                      min="1"
                      placeholder="30"
                      value={recurrenceDays}
                      onChange={(e) => setRecurrenceDays(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">days</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={buttonVariants()}
              disabled={pending}
            >
              {pending ? "Adding…" : "Add Expense"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
