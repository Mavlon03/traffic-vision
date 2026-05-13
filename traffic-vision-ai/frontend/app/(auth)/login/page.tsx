import { AppShell } from "@/components/layout/app-shell";
import { AuthForm } from "@/components/ui/auth-form";

export default function LoginPage() {
  return (
    <AppShell requireAuth={false}>
      <AuthForm mode="login" />
    </AppShell>
  );
}
