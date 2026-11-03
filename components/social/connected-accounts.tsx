"use client";

import { ArrowsRotateRight, CircleExclamation } from "@gravity-ui/icons";
import { AlertDialog, Avatar, Button, buttonVariants, Chip, Description, Switch, toast } from "@heroui/react";
import { useState, useTransition } from "react";
import { disconnectAccountAction, setAutoReplyAction } from "@/app/dashboard/settings/actions";
import { LogoFacebook, LogoInstagram } from "@/components/icons/brand-icons";

/** Client-safe view of a SocialAccount (never includes tokens). */
export interface ConnectedAccountView {
  id: string;
  provider: "INSTAGRAM" | "FACEBOOK";
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  typeLabel: string | null;
  status: "ACTIVE" | "NEEDS_RECONNECT";
  statusMessage: string | null;
  tokenExpiryLabel: string | null;
  /** Instagram only */
  webhooksSubscribed: boolean;
  autoReplyEnabled: boolean;
  autoReplyBlockers: string[];
}

const PROVIDER = {
  INSTAGRAM: { label: "Instagram", icon: LogoInstagram, connect: "/api/social/instagram/connect" },
  FACEBOOK: { label: "Facebook Page", icon: LogoFacebook, connect: "/api/social/facebook/connect" },
} as const;

export function ConnectedAccountList({ accounts }: { accounts: ConnectedAccountView[] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {accounts.map((a) => (
        <li key={a.id} className="p-4">
          <AccountRow account={a} />
        </li>
      ))}
    </ul>
  );
}

function AccountRow({ account }: { account: ConnectedAccountView }) {
  const provider = PROVIDER[account.provider];
  const Icon = provider.icon;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();

  function disconnect() {
    startDisconnect(async () => {
      const res = await disconnectAccountAction(account.id);
      if (res.ok) {
        setConfirmOpen(false);
        toast.success(`${account.name} disconnected`);
      } else {
        toast.danger(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar size="md" className="shrink-0">
            {account.avatarUrl ? <Avatar.Image src={account.avatarUrl} alt="" /> : null}
            <Avatar.Fallback>{account.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{account.name}</span>
              <Chip size="sm" variant="soft" color={account.status === "ACTIVE" ? "success" : "danger"}>
                {account.status === "ACTIVE" ? "Active" : "Needs reconnect"}
              </Chip>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
              <Icon className="size-3.5" />
              <span>{provider.label}</span>
              {account.handle ? <span>· {account.handle}</span> : null}
              {account.typeLabel ? <span>· {account.typeLabel}</span> : null}
              {account.tokenExpiryLabel ? <span>· {account.tokenExpiryLabel}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={provider.connect}
            className={buttonVariants({ variant: account.status === "ACTIVE" ? "ghost" : "primary", size: "sm" })}
          >
            <ArrowsRotateRight className="size-4" aria-hidden />
            Reconnect
          </a>
          <Button variant="danger-soft" size="sm" onPress={() => setConfirmOpen(true)}>
            Disconnect
          </Button>
        </div>
      </div>

      {account.statusMessage ? (
        <p className={`flex items-start gap-2 text-sm ${account.status === "ACTIVE" ? "text-warning" : "text-danger"}`}>
          <CircleExclamation className="mt-0.5 size-4 shrink-0" aria-hidden />
          {account.statusMessage}
        </p>
      ) : null}

      {account.provider === "INSTAGRAM" ? <AutoReplyControl account={account} /> : null}

      <AlertDialog.Backdrop isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Disconnect {account.name}?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-muted">
                Linkee will delete its access token for this {provider.label.toLowerCase()}
                {account.provider === "INSTAGRAM" ? ", along with its synced comments and reply drafts" : ""}. Nothing is
                removed from {account.provider === "INSTAGRAM" ? "Instagram" : "Facebook"}. You can reconnect any time.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={disconnecting}>
                Cancel
              </Button>
              <Button variant="danger" isPending={disconnecting} onPress={disconnect}>
                Disconnect
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}

function AutoReplyControl({ account }: { account: ConnectedAccountView }) {
  const [enabled, setEnabled] = useState(account.autoReplyEnabled);
  const [pending, startTransition] = useTransition();
  const blocked = account.autoReplyBlockers.length > 0;

  function toggle(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const res = await setAutoReplyAction(account.id, next);
      if (res.ok) {
        toast.success(next ? "Auto-reply is on" : "Auto-reply is off");
      } else {
        setEnabled(!next);
        toast.danger(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl bg-default/50 p-4">
      <Switch
        isSelected={enabled}
        onChange={toggle}
        // Turning it off is always allowed, even when prerequisites have lapsed.
        isDisabled={pending || (blocked && !enabled)}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <span className="text-sm font-medium">Auto-reply with AI</span>
        </Switch.Content>
        <Description>
          Replies only to new comments on your own posts (within 24 hours), skips spam, links and your skip keywords, and
          stops at your daily limit. Turn it off any time.
        </Description>
      </Switch>
      {blocked ? (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-xs text-muted">
          {account.autoReplyBlockers.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
