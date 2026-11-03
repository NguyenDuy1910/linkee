import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/app/signup/signup-form";
import { AuthCard } from "@/components/marketing/auth-card";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create your page",
  description: "Claim your Linkee username and publish your link-in-bio page in under a minute.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthCard
      title="Create your page"
      description="One form, and your link-in-bio page is live."
      footer={{ text: "Already have an account?", href: "/login", label: "Log in" }}
    >
      <SignupForm />
    </AuthCard>
  );
}
