import { LogoFacebook, LogoInstagram } from "@/components/icons/brand-icons";
import type { PublishProvider } from "@/lib/publishing-rules";

/** Brand mark for a publishing destination. Decorative: pair it with a text label. */
export function ProviderIcon({ provider, className = "size-3.5" }: { provider: PublishProvider; className?: string }) {
  const Icon = provider === "INSTAGRAM" ? LogoInstagram : LogoFacebook;
  return <Icon className={className} aria-hidden />;
}
