import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Transaction } from "@/lib/stats";

function formatDate(raw: string) {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TransactionsTable({ rows }: { rows: Transaction[] }) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatDate(row.timestamp)}
              </TableCell>
              <TableCell className="font-medium">{row.merchant}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {row.card}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
