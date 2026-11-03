import { Alert } from "@heroui/react";
import { env } from "@/lib/env";
import { UPGRADE_MESSAGE } from "@/lib/plans";

/** Server component: explains a PRO-only feature; links to UPGRADE_URL when configured. */
export function UpgradeNotice({ title = "Upgrade to Linkee Pro" }: { title?: string }) {
  const url = env().UPGRADE_URL;
  return (
    <Alert status="accent">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>
          {UPGRADE_MESSAGE}{" "}
          {url ? (
            <a href={url} className="font-medium underline underline-offset-2">
              Upgrade
            </a>
          ) : null}
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
