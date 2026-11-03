import type { Metadata } from "next";
import { loadEditorData } from "@/app/dashboard/my-page/data";
import { BioEditor } from "@/components/bio/editor/bio-editor";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My Page" };

export default async function MyPage({ searchParams }: PageProps<"/dashboard/my-page">) {
  const user = await requireUser();
  const [data, query] = await Promise.all([loadEditorData(user.id), searchParams]);
  return <BioEditor initial={data} appUrl={env().APP_URL} welcome={query.welcome === "1"} />;
}
