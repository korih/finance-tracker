"use client";

import * as React from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
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

interface Props {
  categories: Category[];
  spreadsheetId: string;
}

interface EditState {
  name: string;
  color: string;
  patterns: string;
}

export function ManageCategoriesPanel({ categories, spreadsheetId }: Props) {
  const [editingId, setEditingId]   = React.useState<number | null>(null);
  const [editState, setEditState]   = React.useState<EditState>({ name: "", color: "", patterns: "" });
  const [adding, setAdding]         = React.useState(false);
  const [newState, setNewState]     = React.useState<EditState>({ name: "", color: PRESET_COLORS[0], patterns: "" });
  const [pending, setPending]       = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditState({ name: cat.name, color: cat.color, patterns: cat.patterns.join(", ") });
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
      setNewState({ name: "", color: PRESET_COLORS[0], patterns: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing categories */}
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
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditState((s) => ({ ...s, color: c }))}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: editState.color === c ? "white" : "transparent",
                      }}
                    />
                  ))}
                </div>
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

      {/* Add new category */}
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
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewState((s) => ({ ...s, color: c }))}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newState.color === c ? "white" : "transparent",
                    }}
                  />
                ))}
              </div>
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
