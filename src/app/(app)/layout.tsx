import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationShell } from "@/components/ApplicationShell";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmationDialog";
import { AssistantProvider } from "@/lib/assistant/AssistantContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AssistantProvider>
          <ApplicationShell>{children}</ApplicationShell>
        </AssistantProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
