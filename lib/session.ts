import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Plan } from "@/lib/generated/prisma/client";
import { entitlements, type Entitlements } from "@/lib/plans";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  entitlements: Entitlements;
}

/** Current user from the session, re-read from the DB (deleted users lose access immediately). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, plan: true },
  });
  return user ? { ...user, entitlements: entitlements(user.plan) } : null;
});

/** Use in every dashboard page, server action and route handler that needs a user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
