"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setCategoryBudget, deleteCategoryBudget } from "@/app/actions/budgets";
import type { Category } from "@/lib/classify";

interface CategoryBudgetRow {
  category: string;
  budget: number;
  spent: number;
  color: string;
}

interface Props {
  spreadsheetId: string;
  categories: Category[];
  categoryBudgets: CategoryBudgetRow[];
}

function ProgressBar({ spent, budget, color }: { spent: number; budget: number; color: string }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const barColor =
    pct >= 100 ? "var(--accent3)" : pct >= 80 ? "var(--accent-warm)" : color;
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  );
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

function CategoryBudgetForm({
  spreadsheetId,
  categories,
  existingCategories,
  prefillCategory,
  prefillAmount,
  onClose,
}: {
  spreadsheetId: string;
  categories: Category[];
  existingCategories: string[];
  prefillCategory?: string;
  prefillAmount?: number;
  onClose: () => void;
}) {
  const isEdit = !!prefillCategory;
  const [category, setCategory] = useState(prefillCategory ?? "");
  const [amount, setAmount] = useState(prefillAmount ? String(prefillAmount) : "");
  const [pending, startTransition] = useTransition();

  // Exclude categories already budgeted (unless editing that one)
  const available = categories.filter(
    (c) => !existingCategories.includes(c.name) || c.name === prefillCategory
  );

  function save() {
    if (!category || !amount) return;
    const fd = new FormData();
    fd.set("spreadsheetId", spreadsheetId);
    fd.set("category", category);
    fd.set("amount", amount);
    startTransition(async () => {
      await setCategoryBudget(fd);
      onClose();
    });
  }

  return (
    <div className="space-y-4 pt-2">
      {!isEdit && (
        <div className="space-y-1.5">
          <Label>Category</Label>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">All categories are already budgeted.</p>
          ) : (
            <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {available.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      {isEdit && (
        <p className="text-sm font-medium">{prefillCategory}</p>
      )}
      <div className="space-y-1.5">
        <Label>Monthly limit</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            autoFocus={isEdit}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="pl-7"
            placeholder="0.00"
            disabled={pending}
          />
        </div>
      </div>
      <Button
        className="w-full"
        onClick={save}
        disabled={pending || !category || !amount}
      >
        {pending ? "Saving…" : isEdit ? "Update limit" : "Set budget"}
      </Button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BudgetCategoryList({ spreadsheetId, categories, categoryBudgets }: Props) {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryBudgetRow | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const existingCategories = categoryBudgets.map((b) => b.category);

  function deleteCategory(cat: string) {
    const fd = new FormData();
    fd.set("spreadsheetId", spreadsheetId);
    fd.set("category", cat);
    startDeleteTransition(() => deleteCategoryBudget(fd));
  }

  return (
    <div className="space-y-3">
      {/* Add button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button className="w-full border border-dashed border-border rounded-xl p-4 text-sm text-primary font-medium hover:bg-muted/40 transition-colors" />
          }
        >
          + Budget another category
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Budget a category</DialogTitle>
          </DialogHeader>
          <CategoryBudgetForm
            spreadsheetId={spreadsheetId}
            categories={categories}
            existingCategories={existingCategories}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit budget</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CategoryBudgetForm
              spreadsheetId={spreadsheetId}
              categories={categories}
              existingCategories={existingCategories}
              prefillCategory={editTarget.category}
              prefillAmount={editTarget.budget}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category budget rows */}
      {categoryBudgets.map((row) => {
        const remaining = row.budget - row.spent;
        const pct = row.budget > 0 ? (row.spent / row.budget) * 100 : 0;
        const overBudget = pct >= 100;

        return (
          <div key={row.category} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: row.color }}
                />
                <span className="font-medium text-sm">{row.category}</span>
                {overBudget && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent3/20 text-accent3 font-medium">
                    Over
                  </span>
                )}
              </div>
              <div className="flex gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditTarget(row)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteCategory(row.category)}
                  disabled={deletePending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <ProgressBar spent={row.spent} budget={row.budget} color={row.color} />

            <div className="flex justify-between text-sm">
              <span>
                <span className="font-semibold tabular-nums">{fmt(row.spent)}</span>
                <span className="text-muted-foreground"> of {fmt(row.budget)}</span>
              </span>
              <span className={overBudget ? "text-accent3 font-medium" : "text-muted-foreground"}>
                {overBudget
                  ? `${fmt(Math.abs(remaining))} over`
                  : `${fmt(remaining)} left`}
              </span>
            </div>
          </div>
        );
      })}

      {categoryBudgets.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No category budgets yet. Add one above.
        </p>
      )}
    </div>
  );
}
