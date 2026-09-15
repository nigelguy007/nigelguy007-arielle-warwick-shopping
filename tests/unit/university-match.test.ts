// Regression: ISSUE-001, ISSUE-002 — onboarding's "Use Warwick campus"
// shortcut and Home's "Warwick already provides" card were shown to every
// student regardless of university (both gated on isWarwickUniversityName).
// Found by /qa on 2026-09-15
// Report: .gstack/qa-reports/qa-report-arielle-onboarding-2026-09-15.md
import { describe, expect, it } from "vitest";
import { isWarwickUniversityName } from "@/lib/university-match";

describe("isWarwickUniversityName", () => {
  it("matches Warwick under the spellings a student is likely to type", () => {
    expect(isWarwickUniversityName("University of Warwick")).toBe(true);
    expect(isWarwickUniversityName("The University of Warwick")).toBe(true);
    expect(isWarwickUniversityName("  university of warwick  ")).toBe(true);
    expect(isWarwickUniversityName("University   of   Warwick")).toBe(true);
  });

  it("does not match other universities, including near-miss substrings", () => {
    expect(isWarwickUniversityName("University of Bath")).toBe(false);
    expect(isWarwickUniversityName("University of Exeter")).toBe(false);
    expect(isWarwickUniversityName("University of Warwickshire")).toBe(false);
    expect(isWarwickUniversityName("Warwick")).toBe(false);
  });

  it("does not match an empty or blank name", () => {
    expect(isWarwickUniversityName("")).toBe(false);
    expect(isWarwickUniversityName("   ")).toBe(false);
  });
});
