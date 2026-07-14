import { AppShell } from "./components/shell/AppShell";
import { EkReportModule } from "./EkReportModule";

export default function App() {
  return (
    <AppShell crumbs={["Projekte", "Finanzia AG - 2026"]}>
      <EkReportModule />
    </AppShell>
  );
}
