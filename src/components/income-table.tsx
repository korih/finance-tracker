import { Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { IncomeEntry } from "@/lib/income";
import { INCOME_TYPE_LABELS } from "@/lib/income";
import { removeIncomeEntry } from "@/app/actions/income";
import { EditIncomeButton } from "@/components/edit-income-button";

function formatDate(raw: string) {
  const str = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const d = new Date(str);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
}

export function IncomeTable({
  entries,
  spreadsheetId,
}: {
  entries: IncomeEntry[];
  spreadsheetId: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No income entries found.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatDate(entry.date)}
              </TableCell>
              <TableCell className="font-medium">{entry.source}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {INCOME_TYPE_LABELS[entry.type] ?? entry.type}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${entry.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right p-1">
                <div className="flex items-center justify-end gap-0.5">
                  <EditIncomeButton entry={entry} spreadsheetId={spreadsheetId} />
                  <form action={removeIncomeEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="spreadsheetId" value={spreadsheetId} />
                    <Button type="submit" variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
