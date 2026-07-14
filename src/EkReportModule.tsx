import { useState } from "react";
import { Tabs } from "./components/ui/Tabs";
import { ModuleStub } from "./components/ui/ModuleStub";
import { Icon } from "./components/ui/Icon";
import EigenkapitalnachweisEditor from "./EigenkapitalnachweisEditor";

// Tab set from the live aumico project view (Finanzia AG – 2026).
const REPORT_TABS = [
  { id: "allgemein", label: "Allgemeine Informationen" },
  { id: "saldobilanz", label: "Saldobilanz importieren" },
  { id: "umgliederungen", label: "Umgliederungen & Stille Reserven" },
  { id: "geldfluss", label: "Geldflussrechnung" },
  { id: "eigenkapital", label: "Eigenkapitalnachweis" },
  { id: "anhang", label: "Anhang" },
  { id: "ergaenzend", label: "Ergänzende Berichte" },
  { id: "abschluss", label: "Abschluss & Druck" },
];

const STUB_TITLES: Record<string, string> = {
  allgemein: "Allgemeine Informationen",
  saldobilanz: "Saldobilanz importieren",
  umgliederungen: "Umgliederungen & Stille Reserven",
  geldfluss: "Geldflussrechnung",
  anhang: "Anhang",
  ergaenzend: "Ergänzende Berichte",
  abschluss: "Abschluss & Druck",
};

export function EkReportModule() {
  const [tab, setTab] = useState("eigenkapital");

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <button
          type="button"
          className="btn btn-alt btn-xs"
          style={{ border: "none", padding: "4px 8px" }}
        >
          <Icon name="chev-lt" /> Zurück
        </button>
      </div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Finanzia AG - 2026</h1>
      </div>

      <Tabs tabs={REPORT_TABS} value={tab} onChange={setTab} />

      {tab === "eigenkapital" ? (
        <EigenkapitalnachweisEditor />
      ) : (
        <ModuleStub title={STUB_TITLES[tab]} />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid var(--gray-200)",
        }}
      >
        <button type="button" className="btn btn-alt">
          <Icon name="chev-lt" /> Zurück zu Geldflussrechnung
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-alt">
            Speichern
          </button>
          <button type="button" className="btn btn-primary">
            Speichern und weiter zu Anhang
          </button>
        </div>
      </div>
    </>
  );
}
