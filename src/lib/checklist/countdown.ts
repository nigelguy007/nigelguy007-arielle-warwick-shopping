/** Whole days from today until an ISO date (YYYY-MM-DD), local-date based
 * (not UTC) so "today" matches what the user sees on their device. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(isoDate + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86_400_000);
}

export function countdownLabel(isoDate: string | null, now: Date = new Date()): string | null {
  if (!isoDate) return null;
  const days = daysUntil(isoDate, now);
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "1 day to go";
  if (days === 0) return "Moving in today";
  return "Move-in day has passed";
}
