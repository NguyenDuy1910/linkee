import { Envelope, Globe } from "@gravity-ui/icons";
import type { SVGProps } from "react";
import {
  LogoFacebook,
  LogoGithub,
  LogoInstagram,
  LogoLinkedin,
  LogoTelegram,
  LogoThreads,
  LogoTiktok,
  LogoX,
  LogoYoutube,
} from "@/components/icons/brand-icons";
import type { SocialPlatform } from "@/lib/bio";

const ICONS: Record<SocialPlatform, (props: SVGProps<SVGSVGElement>) => React.ReactNode> = {
  instagram: LogoInstagram,
  tiktok: LogoTiktok,
  youtube: LogoYoutube,
  x: LogoX,
  threads: LogoThreads,
  facebook: LogoFacebook,
  linkedin: LogoLinkedin,
  github: LogoGithub,
  telegram: LogoTelegram,
  email: Envelope,
  website: Globe,
};

export function SocialIcon({ platform, ...props }: { platform: SocialPlatform } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[platform];
  return <Icon aria-hidden {...props} />;
}
