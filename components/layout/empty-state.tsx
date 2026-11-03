/** Centered empty state with an icon, short explanation, and a single next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-full bg-default text-muted [&>svg]:size-5">{icon}</div> : null}
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
