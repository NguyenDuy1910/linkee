"use client";

import { Avatar, Checkbox } from "@heroui/react";
import type { PublishAccountDTO } from "@/lib/publishing";
import { PROVIDER_LABELS } from "@/lib/publishing-rules";
import { ProviderIcon } from "./provider-icon";

const PROVIDER_PATH = { INSTAGRAM: "instagram", FACEBOOK: "facebook" } as const;

export function DestinationPicker({
  accounts,
  selected,
  onToggle,
}: {
  accounts: PublishAccountDTO[];
  selected: string[];
  onToggle: (id: string, isSelected: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Destinations">
        {accounts.map((account) => {
          const needsReconnect = account.status !== "ACTIVE";
          const isSelected = !needsReconnect && selected.includes(account.id);
          return (
            <li
              key={account.id}
              className={`rounded-2xl border transition-colors ${
                isSelected ? "border-accent bg-accent/5" : "border-border bg-surface"
              } ${needsReconnect ? "opacity-80" : ""}`}
            >
              <Checkbox
                isSelected={isSelected}
                isDisabled={needsReconnect}
                onChange={(value) => onToggle(account.id, value)}
                className="w-full"
              >
                <Checkbox.Content className="flex w-full cursor-pointer items-center gap-3 p-3">
                  <Avatar size="sm">
                    {account.avatarUrl ? <Avatar.Image alt="" src={account.avatarUrl} /> : null}
                    <Avatar.Fallback>{account.name.replace(/^@/, "").slice(0, 2).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{account.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <ProviderIcon provider={account.provider} className="size-3" />
                      {account.provider === "FACEBOOK" ? "Facebook Page" : PROVIDER_LABELS.INSTAGRAM}
                    </span>
                  </span>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
              {needsReconnect ? (
                <p className="flex flex-wrap items-center gap-x-2 border-t border-border px-3 py-2 text-xs text-warning">
                  <span>{account.statusMessage || "Needs reconnect"}</span>
                  <a
                    href={`/api/social/${PROVIDER_PATH[account.provider]}/connect`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Reconnect
                  </a>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">Coming later: TikTok, YouTube, LinkedIn, Threads, X</p>
    </div>
  );
}
