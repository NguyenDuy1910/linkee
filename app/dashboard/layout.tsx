import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  const page = await db.bioPage.findUnique({ where: { userId: user.id }, select: { slug: true } });
  return (
    <AppShell user={{ email: user.email, name: user.name, planLabel: user.entitlements.label }} slug={page?.slug ?? null}>
      {children}
    </AppShell>
  );
}
