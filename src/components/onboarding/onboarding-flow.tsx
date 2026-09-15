"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { useLocationContext } from "@/lib/client/location";
import { TERMS_SECTIONS } from "@/lib/legal/terms";
import type { AccommodationProfile } from "@/lib/types";

const PRESETS = [100, 200, 300, 500];
const YEAR_OPTIONS = ["1st year", "2nd year", "3rd year", "4th year", "Postgraduate"];
const TOTAL_STEPS = 7;

export function OnboardingFlow({ accommodations, firstName, university: initialUniversity }: { accommodations: AccommodationProfile[]; firstName: string; university: string }) {
  const router = useRouter();
  const loc = useLocationContext();
  const [step, setStep] = useState(0);

  // Step 0 - About you.
  const [university, setUniversity] = useState(initialUniversity);
  const [universityLocation, setUniversityLocation] = useState("");
  const [name, setName] = useState(firstName);
  const [yearOfStudy, setYearOfStudy] = useState<string | null>(null);

  // Step 2 - Terms.
  const [agreed, setAgreed] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentSaved, setConsentSaved] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Steps 3-6 - accommodation / budget / move-in date / location (unchanged from before).
  const [slug, setSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runs once, when the terms are accepted: this is the point "data is
  // being saved" first happens - university/name/year go to the backend
  // together with server-stamped consent, before any later onboarding step.
  const acceptTerms = async () => {
    setSavingConsent(true);
    setConsentError(null);
    try {
      await api("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          firstName: name.trim() || "Arielle",
          university: university.trim() || initialUniversity,
          universityLocation: universityLocation.trim() || null,
          yearOfStudy,
          termsAccepted: true,
        }),
      });
      setConsentSaved(true);
      setStep(3);
    } catch (e) {
      setConsentError(e instanceof Error ? e.message : "Couldn't save - check your connection and try again.");
    } finally {
      setSavingConsent(false);
    }
  };

  const finish = async (defaultPostcode: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/profile", { method: "POST", body: JSON.stringify({ accommodationSlug: slug, budget, defaultPostcode, onboardingComplete: true }) });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      setSaving(false);
    }
  };

  // Move-in date is optional/skippable, so it's saved on its own as soon as
  // it's set rather than folded into finish() - a failure here shouldn't
  // block the rest of onboarding from completing.
  const continueFromDate = async () => {
    setSavingDate(true);
    try {
      await api("/api/profile", { method: "POST", body: JSON.stringify({ moveInDate }) });
    } catch {
      // Non-critical - finish() still saves the rest of the profile.
    } finally {
      setSavingDate(false);
      setStep(6);
    }
  };

  const filtered = accommodations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const chosen = accommodations.find((a) => a.slug === slug);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-8" style={{ paddingTop: "calc(var(--sat) + 2rem)" }}>
      <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-[var(--ring-track)]"}`} />
        ))}
      </div>

      {step === 0 ? (
        <section className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="font-display text-[30px] font-extrabold tracking-[-0.5px]">First, a bit about you</h1>
          <p className="text-foreground-secondary">This is used to personalise your checklist and isn&apos;t shared with anyone unless you choose to.</p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Your name
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Arielle" autoComplete="given-name" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            University
            <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University of Warwick" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            University location <span className="font-normal text-foreground-secondary">(optional)</span>
            <Input value={universityLocation} onChange={(e) => setUniversityLocation(e.target.value)} placeholder="Coventry, UK" />
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-semibold">
            Year of study <span className="font-normal text-foreground-secondary">(optional)</span>
            <div className="flex flex-wrap gap-2">
              {YEAR_OPTIONS.map((y) => (
                <Chip key={y} active={yearOfStudy === y} onClick={() => setYearOfStudy(yearOfStudy === y ? null : y)}>{y}</Chip>
              ))}
            </div>
          </div>
          <Button size="lg" onClick={() => setStep(1)} disabled={!name.trim() || !university.trim()}>Continue</Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="font-display text-[30px] font-extrabold tracking-[-0.5px]">Let&apos;s get {name.trim() || "you"} ready for {university.trim() || initialUniversity}</h1>
          <p className="text-foreground-secondary">A checklist that knows what you already have, what to buy next, where it&apos;s cheapest, and how much you have left.</p>
          <div className="glass-card flex flex-col gap-1 px-4 py-3.5 text-sm">
            <div className="flex justify-between"><span className="text-foreground-secondary">Student</span><span className="font-semibold">{name.trim() || "—"}</span></div>
            <div className="flex justify-between"><span className="text-foreground-secondary">University</span><span className="font-semibold">{university.trim() || initialUniversity}</span></div>
            {universityLocation.trim() ? <div className="flex justify-between"><span className="text-foreground-secondary">Location</span><span className="font-semibold">{universityLocation.trim()}</span></div> : null}
            {yearOfStudy ? <div className="flex justify-between"><span className="text-foreground-secondary">Year</span><span className="font-semibold">{yearOfStudy}</span></div> : null}
          </div>
          <div className="mt-auto flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1" size="lg" onClick={() => setStep(2)}>Start</Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">Before we save anything</h1>
          <p className="text-sm text-foreground-secondary">A quick summary of how your data is used - full detail any time at <Link href="/legal/terms" target="_blank" className="font-semibold text-accent-ink underline">the terms &amp; privacy notice</Link>.</p>
          <div className="glass-card flex flex-col gap-3 px-4 py-3.5 text-sm">
            {TERMS_SECTIONS.slice(0, 4).map((s) => (
              <div key={s.heading}>
                <div className="font-semibold">{s.heading}</div>
                <p className="text-foreground-secondary">{s.body[0]}</p>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-border accent-[var(--accent)]"
              aria-label="I agree to the terms and privacy notice"
            />
            <span>
              I&apos;ve read and agree to the{" "}
              <Link href="/legal/terms" target="_blank" className="font-semibold text-accent-ink underline">terms &amp; privacy notice</Link>, and I&apos;m okay with the details above being saved so the app can work.
            </span>
          </label>
          {consentError ? <p className="text-sm text-warn">{consentError}</p> : null}
          <div className="mt-auto flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" size="lg" onClick={acceptTerms} disabled={!agreed || consentSaved} loading={savingConsent}>Accept &amp; continue</Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">Which {university.trim() || initialUniversity} accommodation are you staying in?</h1>
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
          <div className="mt-auto flex gap-2"><Button variant="ghost" onClick={() => setStep(2)}>Back</Button><Button className="flex-1" size="lg" onClick={() => setStep(4)}>Next</Button></div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">How much do you want to spend?</h1>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <Button key={p} variant={budget === p ? "primary" : "ghost"} size="lg" onClick={() => { setBudget(p); setCustom(""); }}>£{p}</Button>
            ))}
          </div>
          <Input inputMode="decimal" value={custom} onChange={(e) => { setCustom(e.target.value.replace(/[^\d.]/g, "")); setBudget(e.target.value ? Number(e.target.value.replace(/[^\d.]/g, "")) : null); }} placeholder="Custom amount (£)" aria-label="Custom budget" />
          <div className="mt-auto flex gap-2"><Button variant="ghost" onClick={() => setStep(3)}>Back</Button><Button variant="ghost" onClick={() => { setBudget(null); setStep(5); }}>Skip</Button><Button className="flex-1" size="lg" onClick={() => setStep(5)}>Next</Button></div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">When do you move in?</h1>
          <p className="text-sm text-foreground-secondary">So I can count down to move-in day on your home screen. You can add this later too.</p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Move-in date
            <Input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} aria-label="Move-in date" />
          </label>
          <div className="mt-auto flex gap-2">
            <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>
            <Button variant="ghost" onClick={() => setStep(6)}>Skip</Button>
            <Button className="flex-1" size="lg" onClick={continueFromDate} loading={savingDate} disabled={!moveInDate}>Continue</Button>
          </div>
        </section>
      ) : null}

      {step === 6 ? (
        <section className="flex flex-1 flex-col gap-4 pt-8">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">Share your location and I can find shops near you.</h1>
          <p className="text-sm text-foreground-secondary">Only used when you search. Nothing is tracked or stored.</p>
          <Button size="lg" onClick={() => { loc.useDevice(); }} loading={loc.status === "locating"}>Use my location</Button>
          <Button size="lg" variant="secondary" onClick={() => { loc.useCampus(); void finish("CV4 7AL"); }} loading={saving}>Use Warwick campus</Button>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void finish(postcode.trim().toUpperCase() || null); }}>
            <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Enter a postcode" autoCapitalize="characters" aria-label="Postcode" />
            <Button type="submit" variant="ghost" loading={saving}>Go</Button>
          </form>
          {loc.location?.source === "device" ? <Button size="lg" variant="success" onClick={() => finish(null)} loading={saving}>Location shared · Finish</Button> : null}
          {loc.error ? <p className="text-sm text-warn">{loc.error}</p> : null}
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <div className="mt-auto flex gap-2"><Button variant="ghost" onClick={() => setStep(5)}>Back</Button><Button variant="ghost" className="flex-1" onClick={() => finish(null)} loading={saving}>Skip for now</Button></div>
        </section>
      ) : null}
    </main>
  );
}
