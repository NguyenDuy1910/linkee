"use client";

import { ArrowsRotateRight } from "@gravity-ui/icons";
import { Button, Label, ListBox, Select, Spinner, toast, type Key } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshCommentsAction } from "@/app/dashboard/inbox/actions";

export function RefreshButton({ accountId, variant = "primary" }: { accountId: string; variant?: "primary" | "secondary" }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      isPending={pending}
      onPress={() =>
        startTransition(async () => {
          const res = await refreshCommentsAction(accountId);
          if (res.ok) toast.success(res.data.message);
          else toast.danger(res.error);
        })
      }
    >
      {({ isPending }) => (
        <>
          {isPending ? <Spinner color="current" size="sm" /> : <ArrowsRotateRight className="size-4" aria-hidden />}
          {isPending ? "Refreshing…" : "Refresh"}
        </>
      )}
    </Button>
  );
}

export function AccountSwitcher({
  accounts,
  selectedId,
  status,
}: {
  accounts: { id: string; label: string }[];
  selectedId: string;
  status: string;
}) {
  const router = useRouter();

  function select(key: Key | null) {
    if (key === null || key === selectedId) return;
    const params = new URLSearchParams({ account: String(key), status });
    router.push(`/dashboard/inbox?${params.toString()}`);
  }

  return (
    <Select className="w-56" value={selectedId} onChange={select} aria-label="Instagram account">
      <Label className="sr-only">Instagram account</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {accounts.map((a) => (
            <ListBox.Item key={a.id} id={a.id} textValue={a.label}>
              {a.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
