"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, RotateCcw } from "lucide-react";
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
import { CategoryBadge } from "@/components/category-badge";
import type { Category } from "@/lib/classify";

type SortKey = "timestamp" | "merchant" | "category" | "card" | "amount";
type SortDir = "asc" | "desc";

function formatDate(raw: string) {
  const str = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const d = new Date(str);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
}

function sortRows(rows: TransactionRow[], key: SortKey, dir: SortDir): TransactionRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "timestamp") {
      cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (key === "merchant") {
      cmp = a.merchant.localeCompare(b.merchant);
    } else if (key === "category") {
      cmp = (a.category ?? "").localeCompare(b.category ?? "");
    } else if (key === "card") {
      cmp = (a.card ?? "").localeCompare(b.card ?? "");
    } else if (key === "amount") {
      cmp = a.amount - b.amount;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />;
}

export function TransactionsTable({
  rows,
  spreadsheetId,
  categories = [],
}: {
  rows: TransactionRow[];
  spreadsheetId: string;
  categories?: Category[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No transactions found.
      </p>
    );
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default direction per column
      setSortDir(key === "timestamp" || key === "amount" ? "desc" : "asc");
    }
  }

  const sorted = sortRows(rows, sortKey, sortDir);

  function ColHead({
    col,
    label,
    className,
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) {
    const active = sortKey === col;
    return (
      <TableHead className={className}>
        <button
          onClick={() => handleSort(col)}
          className="flex items-center gap-1 select-none hover:text-foreground text-inherit"
        >
          {label}
          <SortIcon active={active} dir={sortDir} />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <ColHead col="timestamp" label="Date" />
            <ColHead col="merchant" label="Merchant" />
            <ColHead col="category" label="Category" />
            <ColHead col="card" label="Card" />
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("amount")}
                className="flex items-center gap-1 select-none hover:text-foreground text-inherit ml-auto"
              >
                Amount
                <SortIcon active={sortKey === "amount"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const excluded = row.excluded === 1;
            return (
              <TableRow
                key={row.id}
                className={excluded ? "opacity-40" : undefined}
              >
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {excluded ? (
                    <span className="text-xs line-through">{formatDate(row.timestamp)}</span>
                  ) : (
                    formatDate(row.timestamp)
                  )}
                </TableCell>
                <TableCell className={excluded ? "line-through font-medium" : "font-medium"}>
                  {row.merchant}
                </TableCell>
                <TableCell>
                  {row.category && (() => {
                    const cat = categories.find((c) => c.name === row.category);
                    return cat
                      ? <CategoryBadge name={cat.name} color={cat.color} />
                      : <CategoryBadge name={row.category} color="#8b8a96" />;
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{row.card}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                        <EditTransactionButton row={row} spreadsheetId={spreadsheetId} categories={categories} />
                        <form action={removeTransaction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="source" value={row.source} />
                          <input type="hidden" name="spreadsheetId" value={spreadsheetId} />
                          <Button type="submit" variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title={row.source === "api" ? "Hide from calculations" : "Delete"}>
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
