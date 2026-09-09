"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { useLocationContext } from "@/lib/client/location";
import type { AccommodationProfile } from "@/lib/types";

const PRESETS = [100, 200, 300, 500];

export function OnboardingFlow({ accommodations, firstName }: { accommodations: AccommodationProfile[]; firstName: string }) {
  const router = useRouter();
  const loc = useLocationContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(firstName);
  const [slug, setSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (defaultPostcode: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/profile", { method: "POST", body: JSON.stringify({ firstName: name.trim() || "Arielle", accommodationSlug: slug, budget, defaultPostcode, onboardingComplete: true }) });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      setSaving(false);
    }
  };

  const filtered = accommodations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const chosen = accommodations.find((a) => a.slug === slug);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-8" style={{ paddingTop: "calc(var(--sat) + 2rem)" }}>
      <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-black/10"}`} />
        ))}
      </div>

      {step === 0 ? (
        <section className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Let&apos;s get you ready for Warwick</h1>
          <p className="text-muted">A checklist that knows what you already have, what to buy next, where it&apos;s cheapest, and how much you have left.</p>
          <label className="text-sm font-medium">Your first name<Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Arielle" /></label>
          <Button size="lg" onClick={() => setStep(1)}>Start</Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Which Warwick accommodation are you staying in?</h1>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search residences" aria-label="Search residences" />
          <div className="flex flex-wrap gap-2">
            {filtered.map((a) => (
              <Chip key={a.slug} active={slug === a.slug} onClick={() => setSlug(a.slug)}>{a.name}</Chip>
            ))}
            <Chip active={slug === null} onClick={() => setSlug(null)}>I don&apos;t know yet</Chip>
          </div>
          {chosen ? (
            <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
              {chosen.verifiedAt ? "Room details verified from the official Warwick page." : "I haven't verified this residence's room details yet, so I won't guess bed size or hob type. "}
              <a href={chosen.officialUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Official page</a>
            </p>
          ) : null}
          <div className="mt-auto flex gap-2"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button className="flex-1" size="lg" onClick={() => setStep(2)}>Next</Button></div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">How much do you want to spend?</h1>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <Button key={p} variant={budget === p ? "primary" : "ghost"} size="lg" onClick={() => { setBudget(p); setCustom(""); }}>£{p}</Button>
            ))}
          </div>
          <Input inputMode="decimal" value={custom} onChange={(e) => { setCustom(e.target.value.replace(/[^\d.]/g, "")); setBudget(e.target.value ? Number(e.target.value.replace(/[^\d.]/g, "")) : null); }} placeholder="Custom amount (£)" aria-label="Custom budget" />
          <div className="mt-auto flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button variant="ghost" onClick={() => { setBudget(null); setStep(3); }}>Skip</Button><Button className="flex-1" size="lg" onClick={() => setStep(3)}>Next</Button></div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Share your location and I can find shops near you.</h1>
          <p className="text-sm text-muted">Only used when you search. Nothing is tracked or stored.</p>
          <Button size="lg" onClick={() => { loc.useDevice(); }} loading={loc.status === "locating"}>Use my location</Button>
          <Button size="lg" variant="secondary" onClick={() => { loc.useCampus(); void finish("CV4 7AL"); }} loading={saving}>Use Warwick campus</Button>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void finish(postcode.trim().toUpperCase() || null); }}>
            <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Enter a postcode" autoCapitalize="characters" aria-label="Postcode" />
            <Button type="submit" variant="ghost" loading={saving}>Go</Button>
          </form>
          {loc.location?.source === "device" ? <Button size="lg" variant="success" onClick={() => finish(null)} loading={saving}>Location shared · Finish</Button> : null}
          {loc.error ? <p className="text-sm text-warn">{loc.error}</p> : null}
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <div className="mt-auto flex gap-2"><Button variant="ghost" onClick={() => setStep(2)}>Back</Button><Button variant="ghost" className="flex-1" onClick={() => finish(null)} loading={saving}>Skip for now</Button></div>
        </section>
      ) : null}
    </main>
  );
}
