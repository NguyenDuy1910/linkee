"use client";

import { ArrowRotateRight, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteDraftAction, retryTargetAction } from "@/app/dashboard/publish/actions";

export function RetryTargetButton({ targetId, accountName }: { targetId: string; accountName: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      isPending={isPending}
      aria-label={`Retry publishing to ${accountName}`}
      onPress={() =>
        startTransition(async () => {
          const res = await retryTargetAction(targetId);
          if (res.ok) toast(`Retrying ${accountName}`);
          else toast.danger("Couldn't retry", { description: res.error });
        })
      }
    >
      <ArrowRotateRight className="size-3.5" aria-hidden />
      Retry
    </Button>
  );
}

export function DeleteDraftButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" variant="ghost" onPress={() => setIsOpen(true)}>
        <TrashBin className="size-3.5" aria-hidden />
        Delete
      </Button>
      <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete this draft?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>The caption and media selection will be removed. This can&apos;t be undone.</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button
                variant="danger"
                isPending={isPending}
                onPress={() =>
                  startTransition(async () => {
                    const res = await deleteDraftAction(postId);
                    if (!res.ok) {
                      toast.danger("Couldn't delete draft", { description: res.error });
                      return;
                    }
                    setIsOpen(false);
                    toast.success("Draft deleted");
                    // Leave the editor if this draft was open in it.
                    if (new URLSearchParams(window.location.search).get("edit") === postId) {
                      router.replace("/dashboard/publish", { scroll: false });
                    }
                  })
                }
              >
                Delete draft
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

/** Re-renders the server components every few seconds while any destination is in flight. */
export function PublishingAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 4_000);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}

/** Formats in the viewer's timezone (the server may run in UTC). */
export function LocalDateTime({ value }: { value: Date }) {
  return (
    <time dateTime={value.toISOString()} suppressHydrationWarning>
      {value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}
