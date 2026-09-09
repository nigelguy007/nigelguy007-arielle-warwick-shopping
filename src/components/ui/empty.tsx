export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-6 text-center">
      <p className="font-semibold">{title}</p>
      {body ? <p className="text-sm text-muted">{body}</p> : null}
      {action}
    </div>
  );
}
