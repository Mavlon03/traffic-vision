import { AppShell } from "@/components/layout/app-shell";
import { ModelManager } from "@/components/models/model-manager";

export default function ModelsPage() {
  return (
    <AppShell>
      <ModelManager />
    </AppShell>
  );
}
