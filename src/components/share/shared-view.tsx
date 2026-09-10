"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { gbp } from "@/lib/utils";
import type { ChecklistView, Contribution } from "@/lib/types";
import type { ChecklistSummary } from "@/lib/checklist/status";
import type { BudgetSummary } from "@/lib/budget/math";

export function SharedView({
  ownerId,
  isSelf,
  isLocalDemo,
  canViewChecklist,
  canViewBudget,
  summary,
  needed,
  budgetSummary,
  contributions,
  contributorNameDefault,
}: {
  ownerId: string;
  isSelf: boolean;
  isLocalDemo: boolean;
  canViewChecklist: boolean;
  canViewBudget: boolean;
  summary: ChecklistSummary | null;
  needed: ChecklistView[];
  budgetSummary: BudgetSummary | null;
  contributions: Contribution[];
  contributorNameDefault: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [itemId, setItemId] = useState("");
  const [name, setName] = useState(contributorNameDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/contributions", { method: "POST", body: JSON.stringify({ ownerId, amount: value, note, checklistItemId: itemId || null, contributorName: name }) });
      setAmount("");
      setNote("");
      setItemId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log that contribution");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-8">
      {isLocalDemo ? (
        <p className="card mb-4 p-3 text-xs text-muted">Demo mode: this previews your own data. A real parent needs their own signed-in account, which needs Supabase mode.</p>
      ) : isSelf ? (
        <p className="card mb-4 p-3 text-xs text-muted">Preview: this is what a parent you&apos;ve shared access with would see.</p>
      ) : null}

      {canViewChecklist && summary ? (
        <>
          <SectionTitle>Checklist progress</SectionTitle>
          <div className="card space-y-3 p-4">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-lg font-bold">{summary.bought}</p>
                <p className="text-muted">Bought</p>
              </div>
              <div>
                <p className="text-lg font-bold">{summary.stillNeeded}</p>
                <p className="text-muted">Still needed</p>
              </div>
              <div>
                <p className="text-lg font-bold">
                  {summary.essentialsDone}/{summary.essentialsTotal}
                </p>
                <p className="text-muted">Essentials</p>
              </div>
            </div>
            {needed.length > 0 ? (
              <ul className="divide-y divide-border pt-2 text-sm">
                {needed.slice(0, 12).map((i) => (
                  <li key={i.id} className="flex justify-between py-1.5">
                    <span>{i.item}</span>
                    <span className="text-muted">{i.budgetEstimate !== null ? gbp(i.budgetEstimate) : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing left on the list.</p>
            )}
          </div>
        </>
      ) : null}

      {canViewBudget && budgetSummary ? (
        <>
          <SectionTitle>Budget</SectionTitle>
          <div className="card grid grid-cols-2 gap-3 p-4 text-sm">
            <div>
              <p className="text-muted">Budget</p>
              <p className="text-lg font-bold">{budgetSummary.budget === null ? "Not set" : gbp(budgetSummary.budget)}</p>
            </div>
            <div>
              <p className="text-muted">Spent</p>
              <p className="text-lg font-bold">{gbp(budgetSummary.spent)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted">Remaining</p>
              <p className={`text-lg font-bold ${budgetSummary.remaining !== null && budgetSummary.remaining < 0 ? "text-red-600" : "text-success"}`}>{budgetSummary.remaining === null ? "—" : gbp(budgetSummary.remaining)}</p>
            </div>
          </div>

          <SectionTitle>Contribution pot</SectionTitle>
          <div className="card space-y-3 p-4">
            <p className="text-sm">
              Contributed so far: <span className="text-lg font-bold">{gbp(totalContributed)}</span>
            </p>
            {contributions.length > 0 ? (
              <ul className="divide-y divide-border text-sm">
                {contributions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-1.5">
                    <span>
                      {c.contributorName}
                      {c.note ? ` · ${c.note}` : ""}
                    </span>
                    <span className="font-semibold">{gbp(c.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No contributions logged yet.</p>
            )}
            <form className="space-y-2 border-t border-border pt-3" onSubmit={submit}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" maxLength={60} />
              <div className="flex gap-2">
                <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Amount" aria-label="Amount" />
                <Button type="submit" loading={saving}>
                  Add
                </Button>
              </div>
              {needed.length > 0 ? (
                <select className="h-12 w-full rounded-2xl border border-border bg-card px-3 text-base" value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Toward a specific item">
                  <option value="">General contribution</option>
                  {needed.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.item}
                    </option>
                  ))}
                </select>
              ) : null}
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" maxLength={200} />
              {error ? <p className="text-sm text-warn">{error}</p> : null}
            </form>
          </div>
        </>
      ) : null}

      {!canViewChecklist && !canViewBudget ? <Empty title="Nothing shared" body="This person hasn't shared their checklist or budget with you." /> : null}
    </div>
  );
}
