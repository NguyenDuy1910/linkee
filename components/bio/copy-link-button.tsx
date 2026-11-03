"use client";

import { Copy } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";

export function CopyLinkButton({ url, variant = "secondary" }: { url: string; variant?: "primary" | "secondary" | "tertiary" }) {
  return (
    <Button
      variant={variant}
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied", { description: url });
        } catch {
          toast.danger("Couldn't access the clipboard. Copy the link from the address bar instead.");
        }
      }}
    >
      <Copy className="size-4" aria-hidden />
      Copy link
    </Button>
  );
}
