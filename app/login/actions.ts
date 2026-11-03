"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { signIn } from "@/lib/auth";

const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult | null> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("Invalid email or password");

  try {
    // Throws a redirect on success; let it propagate.
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(error.type === "CredentialsSignin" ? "Invalid email or password" : "We couldn't sign you in. Please try again.");
    }
    throw error;
  }
  return null;
}
