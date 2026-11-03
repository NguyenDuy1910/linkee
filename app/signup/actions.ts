"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { signIn } from "@/lib/auth";
import { DEFAULT_THEME, DISPLAY_NAME_MAX, slugSchema } from "@/lib/bio";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { hashPassword } from "@/lib/password";

const signupSchema = z.object({
  name: z.string().trim().max(DISPLAY_NAME_MAX, `Keep your name under ${DISPLAY_NAME_MAX} characters`),
  email: z
    .email("Enter a valid email address")
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters").max(200, "Use at most 200 characters"),
  slug: slugSchema,
});

const EMAIL_TAKEN = "An account with this email already exists";
const SLUG_TAKEN = "That username is taken";

async function takenFieldErrors(email: string, slug: string): Promise<Record<string, string>> {
  const [user, page] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.bioPage.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  const errors: Record<string, string> = {};
  if (user) errors.email = EMAIL_TAKEN;
  if (page) errors.slug = SLUG_TAKEN;
  return errors;
}

export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult | null> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  const { name, email, password, slug } = parsed.data;

  const taken = await takenFieldErrors(email, slug);
  if (Object.keys(taken).length > 0) return fail(Object.values(taken)[0], taken);

  const passwordHash = await hashPassword(password);
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, name: name || null, passwordHash } });
      await tx.bioPage.create({
        data: { userId: user.id, slug, displayName: name || slug, theme: DEFAULT_THEME, socialLinks: [] },
      });
    });
  } catch (error) {
    // Lost a race with another signup for the same email or username.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await takenFieldErrors(email, slug);
      return fail(Object.values(raced)[0] ?? "That email or username was just taken. Please try another.", raced);
    }
    throw error;
  }

  try {
    // Throws a redirect on success; let it propagate.
    await signIn("credentials", { email, password, redirectTo: "/dashboard/my-page?welcome=1" });
  } catch (error) {
    if (error instanceof AuthError) return fail("Your account was created, but we couldn't sign you in. Please log in.");
    throw error;
  }
  return null;
}
