"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/** Glass bottom sheet - exact treatment from the design handoff's
 * authorization sheet (dimmed scrim, slide-up glass card with rounded top
 * corners and a drag-handle bar), reused for anything modal that needs it
 * (add-item, store authorization). Escape and scrim-click both close it;
 * `overscroll-behavior: contain` keeps a scroll inside the sheet from
 * scrolling the page behind it. */
export function BottomSheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(10,14,22,0.45)" }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-lg rounded-b-none px-5 pt-4 flex flex-col gap-3.5"
        style={{ paddingBottom: "calc(1.75rem + var(--sab))", overscrollBehavior: "contain" }}
      >
        <div className="mx-auto h-1 w-9 rounded-full" style={{ background: "var(--row-border)" }} />
        {children}
      </div>
    </div>,
    document.body,
  );
}
