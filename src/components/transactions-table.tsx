import { Trash2, RotateCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { TransactionRow } from "@/lib/db";
import { removeTransaction, unexcludeTransaction } from "@/app/actions/transactions";
import { EditTransactionButton } from "@/components/edit-transaction-button";

function formatDate(raw: string) {
  // ISO dates (YYYY-MM-DD) are parsed as UTC midnight; append T12:00:00 so
  // local-time display methods always land on the correct calendar day.
  const str = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const d = new Date(str);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
}

export function TransactionsTable({
  rows,
  spreadsheetId,
}: {
  rows: TransactionRow[];
  spreadsheetId: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No transactions found.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Card</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const excluded = row.excluded === 1;
            return (
              <TableRow
                key={row.id}
                className={excluded ? "opacity-40" : undefined}
              >
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {excluded && (
                    <span className="text-xs mr-1 line-through">
                      {formatDate(row.timestamp)}
                    </span>
                  )}
                  {!excluded && formatDate(row.timestamp)}
                </TableCell>
                <TableCell
                  className={
                    excluded ? "line-through font-medium" : "font-medium"
                  }
                >
                  {row.merchant}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {row.card}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${row.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right p-1">
                  <div className="flex items-center justify-end gap-0.5">
                    {excluded ? (
                      <form action={unexcludeTransaction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="spreadsheetId" value={spreadsheetId} />
                        <Button type="submit" variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Restore">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <EditTransactionButton row={row} spreadsheetId={spreadsheetId} />
                        <form action={removeTransaction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="source" value={row.source} />
                          <input type="hidden" name="spreadsheetId" value={spreadsheetId} />
                          <Button type="submit" variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title={row.source === "sheet" ? "Hide from calculations" : "Delete"}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
