import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { AuthCard } from "@/components/marketing/auth-card";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Log in", alternates: { canonical: "/login" } };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to manage your page, comments and posts."
      footer={{ text: "New to Linkee?", href: "/signup", label: "Create your page" }}
    >
      <LoginForm />
    </AuthCard>
  );
}
