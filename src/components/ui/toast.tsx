/** Bottom toast with an Undo action - exact treatment from the handoff
 * (positioned above the dock, inverted colours vs the page so it reads as a
 * distinct system message). Auto-dismiss timing is owned by the caller. */
export function Toast({ message, onUndo, onDismiss }: { message: string; onUndo?: () => void; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="glass fixed right-14 left-14 z-40 mx-auto h-[46px] max-w-lg overflow-hidden rounded-full"
      style={{ bottom: "calc(var(--dock-h) + var(--sab) + 1.25rem)", background: "var(--toast-bg)", boxShadow: "var(--bar-shadow)" }}
    >
      <div className="flex h-full items-center justify-between px-[18px]" style={{ color: "var(--toast-fg)" }}>
        <span className="text-[13px] font-semibold">{message}</span>
        {onUndo ? (
          <button type="button" onClick={() => { onUndo(); onDismiss(); }} className="text-[13px] font-extrabold text-accent">
            Undo
          </button>
        ) : null}
      </div>
    </div>
  );
}
