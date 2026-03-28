import { RefreshCw, Trash2 } from "lucide-react";
import type { RecurringRule } from "@/lib/recurring";
import { deleteRecurringRule } from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";

const RECURRENCE_LABELS: Record<string, string> = {
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
};

function RecurrenceBadge({ rule }: { rule: RecurringRule }) {
  const label =
    rule.recurrence_type === "custom"
      ? `Every ${rule.recurrence_days ?? "?"} days`
      : (RECURRENCE_LABELS[rule.recurrence_type] ?? rule.recurrence_type);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <RefreshCw className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export function RecurringPanel({
  rules,
  spreadsheetId,
}: {
  rules: RecurringRule[];
  spreadsheetId: string;
}) {
  if (rules.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No recurring expenses set up yet.
        <br />
        <span className="text-xs">Add an expense and mark it as recurring.</span>
      </p>
    );
  }

  const monthlyTotal = rules.reduce((sum, r) => {
    if (r.recurrence_type === "daily")   return sum + r.amount * 30;
    if (r.recurrence_type === "weekly")  return sum + r.amount * 4.33;
    if (r.recurrence_type === "monthly") return sum + r.amount;
    return sum + r.amount * (30 / (r.recurrence_days ?? 30)); // custom
  }, 0);

  return (
    <div className="divide-y">
      {rules.map((rule) => (
        <div key={rule.id} className="flex items-center justify-between py-3 px-1 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{rule.merchant}</span>
              <RecurrenceBadge rule={rule} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rule.card} · since {rule.start_date}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="tabular-nums text-sm font-medium">
              ${rule.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <form action={deleteRecurringRule}>
              <input type="hidden" name="id" value={rule.id} />
              <input type="hidden" name="spreadsheetId" value={spreadsheetId} />
              <input type="hidden" name="entry_type" value="expense" />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-3 px-1 text-sm font-medium">
        <span className="text-muted-foreground">Est. monthly total</span>
        <span>
          ${monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
