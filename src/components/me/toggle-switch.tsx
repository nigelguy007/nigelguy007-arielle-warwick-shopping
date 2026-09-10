import { cn } from "@/lib/utils";

/**
 * Purely visual iOS-style switch (42x25 track, 21px thumb sliding 2px<->19px).
 * Deliberately not its own button/click target - the containing row is the
 * real `role="switch"` control (see NotifyRow / preferences row in
 * me-client.tsx), so tapping anywhere in the row - including visually on
 * this switch - toggles it exactly once instead of double-firing.
 *
 * The thumb is a literal white, not a token: that's the fixed iOS convention
 * (a white thumb on a colored track) rather than something that should
 * invert with the theme the way --on-accent does.
 */
export function ToggleSwitch({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-block h-[25px] w-[42px] shrink-0 rounded-full transition-colors duration-200", className)}
      style={{ background: checked ? "var(--accent)" : "var(--row-border)" }}
    >
      <span
        className="absolute top-[2px] h-[21px] w-[21px] rounded-full bg-white shadow transition-[left] duration-200"
        style={{ left: checked ? "19px" : "2px" }}
      />
    </span>
  );
}
