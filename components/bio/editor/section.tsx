import { Card } from "@heroui/react";

export function EditorSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-none sm:p-6" aria-labelledby={`${id}-title`}>
      <Card.Header className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <Card.Title id={`${id}-title`} className="text-base font-semibold">
            {title}
          </Card.Title>
          {description ? <Card.Description className="mt-0.5 text-sm text-muted">{description}</Card.Description> : null}
        </div>
        {action}
      </Card.Header>
      <Card.Content className="mt-5">{children}</Card.Content>
    </Card>
  );
}
