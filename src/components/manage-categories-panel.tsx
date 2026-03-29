"use client";

import * as React from "react";
import { Pencil, Trash2, X, Check, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge } from "@/components/category-badge";
import {
  addCategory,
  editCategoryPatterns,
  removeCategory,
} from "@/app/actions/categories";
import type { Category } from "@/lib/classify";

const PRESET_COLORS = [
  "#a78bfa", "#34d399", "#ef4444", "#fb923c",
  "#60a5fa", "#f472b6", "#facc15", "#4ade80",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isPreset = PRESET_COLORS.includes(value);

  return (
    <div className="flex gap-1 flex-wrap items-center">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? "white" : "transparent",
          }}
        />
      ))}
      {/* Custom color swatch — clicking it opens the native colour wheel */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 relative overflow-hidden"
        style={{
          backgroundImage: isPreset
            ? [
                "radial-gradient(circle at 38% 35%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 45%, transparent 65%)",
                "conic-gradient(hsl(0,100%,55%), hsl(45,100%,55%), hsl(90,100%,45%), hsl(135,100%,45%), hsl(180,100%,45%), hsl(225,100%,55%), hsl(270,100%,55%), hsl(315,100%,55%), hsl(360,100%,55%))",
              ].join(", ")
            : "none",
          backgroundColor: isPreset ? undefined : value,
          borderColor: !isPreset ? "white" : "transparent",
        }}
        title="Custom colour"
      />
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

interface Props {
  categories: Category[];
  spreadsheetId: string;
}

interface EditState {
  name: string;
  color: string;
  patterns: string;
  hide_from_merchants: boolean;
  hide_from_chart: boolean;
  hide_from_stats: boolean;
}

export function ManageCategoriesPanel({ categories, spreadsheetId }: Props) {
  const [editingId, setEditingId]   = React.useState<number | null>(null);
  const [editState, setEditState]   = React.useState<EditState>({ name: "", color: "", patterns: "", hide_from_merchants: false, hide_from_chart: false, hide_from_stats: false });
  const [adding, setAdding]         = React.useState(false);
  const [newState, setNewState]     = React.useState<EditState>({ name: "", color: PRESET_COLORS[0], patterns: "", hide_from_merchants: false, hide_from_chart: false, hide_from_stats: false });
  const [pending, setPending]       = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditState({
      name: cat.name,
      color: cat.color,
      patterns: cat.patterns.join(", "),
      hide_from_merchants: cat.hide_from_merchants,
      hide_from_chart:     cat.hide_from_chart,
      hide_from_stats:     cat.hide_from_stats,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function submitEdit(cat: Category) {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("id", String(cat.id));
      fd.set("spreadsheetId", spreadsheetId);
      fd.set("name", editState.name.trim() || cat.name);
      fd.set("color", editState.color);
      fd.set("patterns", editState.patterns);
      fd.set("hide_from_merchants", editState.hide_from_merchants ? "1" : "0");
      fd.set("hide_from_chart",     editState.hide_from_chart     ? "1" : "0");
      fd.set("hide_from_stats",     editState.hide_from_stats     ? "1" : "0");
      await editCategoryPatterns(fd);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setPending(false);
    }
  }

  async function submitDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? All affected transactions will be unclassified.`)) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("id", String(cat.id));
      fd.set("spreadsheetId", spreadsheetId);
      await removeCategory(fd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setPending(false);
    }
  }

  async function submitAdd() {
    if (!newState.name.trim()) { setError("Name is required"); return; }
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("spreadsheetId", spreadsheetId);
      fd.set("name", newState.name.trim());
      fd.set("color", newState.color);
      fd.set("patterns", newState.patterns);
      await addCategory(fd);
      setAdding(false);
      setNewState({ name: "", color: PRESET_COLORS[0], patterns: "", hide_from_merchants: false, hide_from_chart: false, hide_from_stats: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Scrollable category list */}
      <div className="overflow-y-auto max-h-[280px] space-y-2 pr-1">
        {categories.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet. Add one to start classifying transactions.
          </p>
        )}

        {categories.map((cat) =>
        editingId === cat.id ? (
          /* Edit row */
          <div key={cat.id} className="rounded-lg border p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={editState.name}
                  onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <ColorPicker
                  value={editState.color}
                  onChange={(c) => setEditState((s) => ({ ...s, color: c }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Patterns (comma-separated regex)</Label>
              <Input
                value={editState.patterns}
                onChange={(e) => setEditState((s) => ({ ...s, patterns: e.target.value }))}
                placeholder="whole foods, safeway, trader joe"
                className="h-8 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Each pattern is a regex tested against the merchant name (case-insensitive).
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> Exclude from
              </p>
              {(
                [
                  ["hide_from_merchants", "Top merchants chart"] ,
                  ["hide_from_chart",     "Spending breakdown chart"],
                  ["hide_from_stats",     "Avg &amp; largest transaction"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer select-none pl-1">
                  <input
                    type="checkbox"
                    checked={editState[field]}
                    onChange={(e) => setEditState((s) => ({ ...s, [field]: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-input accent-primary"
                  />
                  <span className="text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: label }}
                  />
                </label>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={pending}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => submitEdit(cat)} disabled={pending}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          /* Display row */
          <div key={cat.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CategoryBadge name={cat.name} color={cat.color} />
              {(cat.hide_from_merchants || cat.hide_from_chart || cat.hide_from_stats) && (
                <span title="Excluded from some stats">
                  <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                </span>
              )}
              {cat.patterns.length > 0 ? (
                <span className="text-xs text-muted-foreground truncate">
                  {cat.patterns.slice(0, 3).join(", ")}
                  {cat.patterns.length > 3 && ` +${cat.patterns.length - 3} more`}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">no patterns</span>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0">
              <Button
                type="button" variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => startEdit(cat)}
                disabled={pending}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => submitDelete(cat)}
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
      )}
      </div>

      {/* Add new category — outside scroll area */}
      {adding ? (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={newState.name}
                onChange={(e) => setNewState((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Groceries"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <ColorPicker
                value={newState.color}
                onChange={(c) => setNewState((s) => ({ ...s, color: c }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Patterns (comma-separated regex)</Label>
            <Input
              value={newState.patterns}
              onChange={(e) => setNewState((s) => ({ ...s, patterns: e.target.value }))}
              placeholder="whole foods, safeway, trader joe"
              className="h-8 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Each pattern is a regex tested against the merchant name (case-insensitive).
            </p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setError(null); }} disabled={pending}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitAdd} disabled={pending}>
              <Check className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button" variant="outline" size="sm"
          className="w-full"
          onClick={() => { setAdding(true); setError(null); }}
        >
          + Add Category
        </Button>
      )}
    </div>
  );
}
