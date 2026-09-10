"use client";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";

/** Add a personal item not on the shared list - deliberately just a name +
 * category, no priority/timing/qty picker, so it's a five-second action. */
export function AddItemSheet({ open, onClose, categories, onCreated }: { open: boolean; onClose: () => void; categories: string[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { onClose(); setName(""); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/checklist", { method: "POST", body: JSON.stringify({ category, item: name.trim() }) });
      onCreated();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={close} label="Add an item">
      <h2 className="font-display text-xl font-extrabold">Add an item</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          What do you need?
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Umbrella" maxLength={80} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-12 w-full rounded-[var(--radius-card)] border border-border bg-card px-4 text-base text-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other</option>
          </select>
        </label>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <Button type="submit" size="lg" loading={saving} disabled={!name.trim()}>Add to checklist</Button>
      </form>
    </BottomSheet>
  );
}
