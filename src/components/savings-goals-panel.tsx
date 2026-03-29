"use client";

import * as React from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSavingsGoal,
  editSavingsGoal,
  removeSavingsGoal,
} from "@/app/actions/savings";
import type { SavingsGoal } from "@/lib/savings";

const PRESET_COLORS = [
  "#34d399", "#a78bfa", "#fb923c", "#60a5fa",
  "#f472b6", "#facc15", "#ef4444", "#4ade80",
];

interface GoalFormState {
  name: string;
  description: string;
  targetAmount: string;
  currentAmount: string;
  color: string;
}

function emptyForm(color = PRESET_COLORS[0]): GoalFormState {
  return { name: "", description: "", targetAmount: "", currentAmount: "", color };
}

function goalToForm(g: SavingsGoal): GoalFormState {
  return {
    name: g.name,
    description: g.description,
    targetAmount: String(g.target_amount),
    currentAmount: String(g.current_amount),
    color: g.color,
  };
}

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{ backgroundColor: c, borderColor: value === c ? "white" : "transparent" }}
        />
      ))}
    </div>
  );
}

function GoalForm({
  state,
  onChange,
  onSave,
  onCancel,
  pending,
  error,
}: {
  state: GoalFormState;
  onChange: (s: GoalFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  function set(key: keyof GoalFormState, val: string) {
    onChange({ ...state, [key]: val });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={state.name} onChange={(e) => set("name", e.target.value)} placeholder="Emergency Fund" className="h-8 text-sm" autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input value={state.description} onChange={(e) => set("description", e.target.value)} placeholder="6 months runway" className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Current ($)</Label>
          <Input type="number" min="0" step="0.01" value={state.currentAmount} onChange={(e) => set("currentAmount", e.target.value)} placeholder="0" className="h-8 text-sm font-mono" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Target ($)</Label>
          <Input type="number" min="0.01" step="0.01" value={state.targetAmount} onChange={(e) => set("targetAmount", e.target.value)} placeholder="10000" className="h-8 text-sm font-mono" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <ColorPicker value={state.color} onChange={(c) => set("color", c)} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={pending}>
          <Check className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

export function SavingsGoalsPanel({
  goals,
  spreadsheetId,
}: {
  goals: SavingsGoal[];
  spreadsheetId: string;
}) {
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editState, setEditState] = React.useState<GoalFormState>(emptyForm());
  const [adding, setAdding]       = React.useState(false);
  const [newState, setNewState]   = React.useState<GoalFormState>(emptyForm());
  const [pending, setPending]     = React.useState(false);
  const [error, setError]         = React.useState<string | null>(null);

  function startEdit(g: SavingsGoal) {
    setEditingId(g.id);
    setEditState(goalToForm(g));
    setAdding(false);
    setError(null);
  }

  function cancelEdit() { setEditingId(null); setError(null); }

  async function submitEdit(g: SavingsGoal) {
    setPending(true); setError(null);
    try {
      const fd = new FormData();
      fd.set("id", String(g.id));
      fd.set("spreadsheetId", spreadsheetId);
      fd.set("name", editState.name || g.name);
      fd.set("description", editState.description);
      fd.set("targetAmount", editState.targetAmount);
      fd.set("currentAmount", editState.currentAmount);
      fd.set("color", editState.color);
      await editSavingsGoal(fd);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setPending(false);
    }
  }

  async function submitDelete(g: SavingsGoal) {
    if (!confirm(`Delete goal "${g.name}"?`)) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("id", String(g.id));
      fd.set("spreadsheetId", spreadsheetId);
      await removeSavingsGoal(fd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setPending(false);
    }
  }

  async function submitAdd() {
    if (!newState.name.trim()) { setError("Name is required"); return; }
    const target = parseFloat(newState.targetAmount);
    if (!target || target <= 0) { setError("Target amount must be > 0"); return; }
    setPending(true); setError(null);
    try {
      const fd = new FormData();
      fd.set("spreadsheetId", spreadsheetId);
      fd.set("name", newState.name.trim());
      fd.set("description", newState.description.trim());
      fd.set("targetAmount", newState.targetAmount);
      fd.set("currentAmount", newState.currentAmount || "0");
      fd.set("color", newState.color);
      await addSavingsGoal(fd);
      setAdding(false);
      setNewState(emptyForm());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setPending(false);
    }
  }

  function fmt(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  return (
    <div className="space-y-4">
      {/* Goals grid */}
      {goals.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No savings goals yet. Add one to start tracking.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) =>
            editingId === g.id ? (
              <div key={g.id} className="rounded-xl border p-4 col-span-full">
                <p className="text-sm font-semibold mb-3">Edit: {g.name}</p>
                <GoalForm
                  state={editState}
                  onChange={setEditState}
                  onSave={() => submitEdit(g)}
                  onCancel={cancelEdit}
                  pending={pending}
                  error={error}
                />
              </div>
            ) : (
              <div
                key={g.id}
                className="rounded-xl p-4 space-y-3 group relative"
                style={{ backgroundColor: "var(--bg-card2)" }}
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(g)} disabled={pending}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => submitDelete(g)} disabled={pending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Goal info */}
                <div>
                  <p className="font-semibold text-sm">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                  )}
                </div>

                {/* Progress bar */}
                <ProgressBar current={g.current_amount} target={g.target_amount} color={g.color} />

                {/* Amounts */}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold font-mono" style={{ color: g.color }}>
                    {fmt(g.current_amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt(g.target_amount)}</span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="rounded-xl border p-4">
          <p className="text-sm font-semibold mb-3">New Goal</p>
          <GoalForm
            state={newState}
            onChange={setNewState}
            onSave={submitAdd}
            onCancel={() => { setAdding(false); setError(null); }}
            pending={pending}
            error={error}
          />
        </div>
      ) : (
        <Button
          type="button" variant="outline" size="sm"
          className="text-sm"
          style={{ color: "var(--accent)" }}
          onClick={() => { setAdding(true); setError(null); }}
        >
          + New goal
        </Button>
      )}
    </div>
  );
}
