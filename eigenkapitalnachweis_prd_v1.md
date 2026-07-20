# PRD — Eigenkapitalnachweis (Bearbeitungs-UI) · aumico AG (funktional, Schicht 1)

> Rein funktional, stack-agnostisch. Der Prototyp ist die verbindliche Vorlage für Layout und
> Funktion. Dieses PRD beschreibt nur, was der Prototyp nicht selbst zeigt. Begleitet die
> persönliche Übergabe an Sam + Engineering.

---

## 1. Meta

| Feld | Wert |
|---|---|
| Feature | Eigenkapitalnachweis — Bearbeitungs-UI |
| Version | 1.10 |
| Status | Draft |
| Scope | Erfassung der Eigenkapital-Bewegungen je Geschäftsjahr und Abstimmung gegen Zielwerte aus dem Kontenmapping. Editierbare Spalten/Zeilen und zwei Textblöcke. |
| Abschnitt | Einzelfeature (ein Tab im Jahresabschluss) |
| Prototyp-Referenz | `github.com/chzurbruegg-PM/aumico-eigenkapitalnachweis` @ `main` HEAD `e69ab8a` (2026-07-14), deployt: `https://aumico-eigenkapitalnachweis.vercel.app` |
| Delta zu vorherigem Abschnitt | — |

---

## 2. Problem Statement

**Was ist das Problem?**
Der Eigenkapitalnachweis existiert in aumico bereits — als starres, ungeführtes Formular mit
schwachem UI/UX. Es fehlt eine Führung durch die Erfassung, eine Kontroll-Abstimmung und die
Anpassung an die Kapitalstruktur des Mandanten. Das kostet Zeit und ist fehleranfällig.

**Was ist die Lösung?**
Ein Redesign, das aus dem starren Formular ein geführtes Werkzeug macht. Anfangs- und
Schlussbestand kommen automatisch aus dem Kontenmapping. Der Treuhänder erfasst nur die
Bewegungen — eine Abstimm-Zeile zeigt je Position sofort, ob alles aufgeht. Spalten und Zeilen
lassen sich benennen, sortieren und ergänzen.

**Warum jetzt?**
Kundenanfragen nach genau dieser Verbesserung häufen sich. Der Nachweis ist zudem fester Teil
jedes Abschlusses — ein schwaches Modul bremst den gesamten Workflow.

---

## 3. User Stories

### Story 1: Bewegungen erfassen und abstimmen
```
Als Treuhänder, möchte ich nur die Eigenkapital-Bewegungen erfassen, damit Anfang und Schluss
je Position automatisch abgestimmt sind.
```
- **UI-Kontext:** Tab „Eigenkapitalnachweis" im Projekt (Prototyp: Tabelle je Geschäftsjahr).
- **Normalfall:** Anfangs-/Schlussbestand kommen grau (read-only) aus dem Mapping. Der User
  erfasst Bewegungszeilen. Die Abstimm-Zeile zeigt grünes ✓, sobald Anfang + Bewegungen den
  Schlussbestand treffen.
- **Fehlerfall:** Bewegungen ergeben nicht den Zielwert → Abstimm-Zeile zeigt orange den
  Restbetrag „noch zu erfassen".
- **Edge-Case:** Für eine Position gibt es keinen Zielwert (manuell ergänzte Spalte) → keine
  Abstimmung, Anzeige „–".

### Story 2: Spalten an den Mandanten anpassen
```
Als Treuhänder, möchte ich Spalten ergänzen, umbenennen, sortieren und löschen, damit der
Nachweis der Kapitalstruktur des Mandanten entspricht.
```
- **UI-Kontext:** Spaltenkopf (Drag-Griff, ⋮-Menü) und Button „+ Neue Spalte" mit Typ-Auswahl.
- **Normalfall:** Je Eigenkapital-Kontogruppe entsteht automatisch genau eine System-Spalte
  (1:1), benannt und geordnet nach der Kontogruppe. Der User ergänzt zusätzlich Wert- oder
  Total-Spalten und sortiert per Drag & Drop.
- **Fehlerfall:** Versuch, eine System-Spalte (aus dem Mapping) zu löschen → „Löschen" ist im
  ⋮-Menü deaktiviert, mit Hinweis „Kommt aus dem Kontenmapping – nicht löschbar".
- **Edge-Case:** Total-Spalte summiert nur die vom User ausgewählten Wertspalten.

### Story 3: Kapitalveränderung im Vorjahr fortschreiben
```
Als Treuhänder, möchte ich Vorjahr und laufendes Jahr in einem Nachweis sehen, damit der
Schlussbestand des Vorjahres automatisch als Anfangsbestand des laufenden Jahres gilt.
```
- **UI-Kontext:** Zwei Geschäftsjahr-Container übereinander (Vorjahr, laufendes Jahr).
- **Normalfall:** Anfangsbestand laufendes Jahr = Schlussbestand Vorjahr. Bewegungen sind je
  Periode separat.
- **Fehlerfall:** Vorjahr nicht abgestimmt → Warnung bleibt bestehen, blockiert aber nicht.
- **Edge-Case:** Erstjahr ohne Vorjahr → der Anfangsbestand wird manuell erfasst (kein
  automatischer Rollforward).

### Story 4: Erläuternde Texte erfassen
```
Als Treuhänder, möchte ich vor und nach der Tabelle Text erfassen, damit der Nachweis
erläutert ist (z.B. ausgegebene Anteilscheine).
```
- **UI-Kontext:** Zwei eigenständige Blöcke **ausserhalb** des Nachweis-Containers —
  „Einleitung" über der Karte, „Anmerkung" unter der Karte.
- **Normalfall:** Editor erscheint nur bei Bedarf; einfache Formatierung (fett/kursiv/
  unterstrichen, Aufzählung/Nummerierung). Vorjahrestext wird als editierbare Vorlage
  übernommen.
- **Fehlerfall:** Leergelassen → kein Text im Nachweis, nur der „hinzufügen"-Button.
- **Edge-Case:** Text bereits aus Vorjahr vorhanden → Block ist offen, Toolbar erscheint erst
  beim Bearbeiten.

### Story 5: Löschen absichern
```
Als Treuhänder, möchte ich vor dem Löschen einer Spalte oder Zeile bestätigen, damit ich
keine erfassten Werte versehentlich verliere.
```
- **UI-Kontext:** Zeilen-„−" und ⋮-Menü „Löschen".
- **Normalfall:** Klick öffnet ein Bestätigungs-Modal mit Namen der Position. Löschung erst
  nach Bestätigung.
- **Fehlerfall:** Abbrechen / Escape / Klick auf den Hintergrund → nichts wird gelöscht.
- **Edge-Case:** Löschen einer Wertspalte entfernt sie auch aus den Quellen aller Total-Spalten.

### Story 6: Automatische Aktualisierung aus der Kontenzuordnung
```
Als Treuhänder, möchte ich, dass sich der EK-Nachweis automatisch aktualisiert, wenn ich die
Kontenzuordnung ändere, damit Anfangs-/Schlussbestand nie veraltet sind.
```
- **UI-Kontext:** Tab „Eigenkapitalnachweis" (die grauen Zielwerte + Abstimm-Zeilen).
- **Normalfall:** Ändert sich die Zuordnung von Eigenkapital-Konten/-Kontogruppen, übernimmt der
  Nachweis die neuen Anfangs-/Schlussbestände automatisch; die Abstimmung wird neu gerechnet.
- **Fehlerfall:** Eine bisher zugeordnete EK-Kontogruppe wird entfernt (im Mapping erlaubt).
  Beim nächsten Öffnen des EK-Nachweises informiert ein Banner darüber; die Spalte inkl.
  Bewegungen wird erst nach Bestätigung gelöscht.
- **Edge-Case:** Neue EK-Kontogruppe kommt dazu → neue System-Spalte erscheint, zunächst ohne
  Bewegungen, mit offener Differenz.

---

## 4. Acceptance Criteria

```
AC-01 [Zielwerte read-only aus Mapping]
✓ Gegeben: Dem Eigenkapital sind Kontogruppen zugeordnet.
✓ Wenn:    Der Treuhänder öffnet den Eigenkapitalnachweis.
✓ Dann:    Anfangs- und Schlussbestand je System-Spalte erscheinen grau, read-only,
           übernommen aus dem Kontenmapping.
✗ Fehler:  Keine Kontogruppe zugeordnet → Leerzustand (AC-10).
⚠ Edge:    Manuell ergänzte Wertspalte hat keinen Mapping-Zielwert → Anfangsbestand ist
           erfassbar, kein Schlussbestand-Ziel.
⚠ Edge:    Erstjahr ohne Vorjahr → der Anfangsbestand ist editierbar (manuell erfasst), nicht
           read-only aus dem Mapping.
```

```
AC-02 [Bewegung erfassen → Fortschreibung]
✓ Gegeben: Geschäftsjahr 2024, Position „Gewinnreserven", Anfangsbestand 40'378'000.00.
✓ Wenn:    Der Treuhänder erfasst „Jahresgewinn" 7'455'000.00 und „Verzinsung" −250'000.00.
✓ Dann:    Berechneter Schlussbestand = 40'378'000.00 + 7'455'000.00 − 250'000.00 = 47'583'000.00.
           Total- und Abstimm-Zeilen aktualisieren sofort.
```

```
AC-03 [Abstimmung exakt]
✓ Gegeben: Zielwert (Schlussbestand aus Mapping) „Gewinnreserven" = 47'583'000.00.
✓ Wenn:    Anfang + Bewegungen = 47'583'000.00.
✓ Dann:    Abstimm-Zeile zeigt grünes ✓ (|Differenz| < 0.005 CHF).
✗ Fehler:  Jahresgewinn 7'000'000 statt 7'455'000 → berechnet 47'128'000 → Differenz 455'000 →
           orange „455'000.00" in der Abstimm-Zeile.
⚠ Edge:    Rundung: Differenz 0.004 CHF → gilt als abgestimmt (✓).
# Zahlenbeispiel: 40'378'000 + 7'000'000 − 250'000 = 47'128'000 ; 47'583'000 − 47'128'000 = 455'000 → E-EK-03 (nicht abgestimmt, nicht blockierend)
```

```
AC-04 [Rollforward Vorjahr → laufendes Jahr]
✓ Gegeben: Schlussbestand 2024 „Anteilscheinkapital" = 1'505'000.00.
✓ Wenn:    Das laufende Jahr 2025 wird angezeigt.
✓ Dann:    Anfangsbestand 2025 „Anteilscheinkapital" = 1'505'000.00 (systemseitig fortgeschrieben,
           nicht editierbar).
⚠ Edge:    Erstjahr ohne Vorjahr in aumico → kein automatischer Anfangsbestand; der Treuhänder
           erfasst den Anfangsbestand je Spalte manuell (editierbar statt read-only).
```

```
AC-05 [Spalte hinzufügen mit Typ-Auswahl]
✓ Gegeben: Der Nachweis ist offen.
✓ Wenn:    Der Treuhänder klickt „+ Neue Spalte" und wählt „Wertspalte" oder „Total-Spalte".
✓ Dann:    Eine neue Spalte des gewählten Typs wird ergänzt (Wertspalte erfassbar,
           Total-Spalte summiert gewählte Wertspalten).
⚠ Edge:    Es gibt genau EINEN Button; der Typ wird im Auswahl-Menü gewählt.
```

```
AC-06 [Total-Spalte konfigurierbar]
✓ Gegeben: Total-Spalte summiert „Anteilscheinkapital", „Zusatz…", „Gewinnreserven" = 54'088'000.00.
✓ Wenn:    Der Treuhänder deaktiviert „Gewinnreserven" (47'583'000) in der Spaltenauswahl (⋮-Menü).
✓ Dann:    Die Total-Spalte zeigt 6'505'000.00 (= 1'505'000 + 5'000'000).
# 54'088'000 − 47'583'000 = 6'505'000
```

```
AC-07 [Löschen mit Bestätigung]
✓ Gegeben: Eine manuell ergänzte Spalte oder eine Bewegungszeile.
✓ Wenn:    Der Treuhänder klickt „Löschen" (⋮-Menü) bzw. „−" (Zeile).
✓ Dann:    Ein Bestätigungs-Modal nennt die Position. Löschung erst nach „Löschen".
✗ Fehler:  System-Spalte → „Löschen" deaktiviert („Kommt aus dem Kontenmapping").
⚠ Edge:    Abbrechen / Escape / Klick auf Hintergrund → keine Löschung.
```

```
AC-08 [Sortieren per Drag & Drop]
✓ Gegeben: Spalten bzw. Bewegungszeilen.
✓ Wenn:    Der Treuhänder zieht eine Spalte/Zeile an eine neue Position.
✓ Dann:    Die Reihenfolge ändert sich; alle Berechnungen bleiben korrekt.
⚠ Edge:    Alternativ „nach links/rechts verschieben" im ⋮-Menü (Spalten).
```

```
AC-09 [Zahlen-Eingabe & Validierung]
✓ Gegeben: Eine Bewegungs- oder Anfangsbestand-Eingabe (manuelle Spalte).
✓ Wenn:    Der Treuhänder gibt „1234.5" ein und verlässt das Feld.
✓ Dann:    Anzeige „1'234.50" — volle CHF, Tausender-Apostroph, IMMER 2 Nachkommastellen.
           Negative Werte erlaubt (z.B. „−250'000.00"). Keine TCHF-Darstellung.
✗ Fehler:  Nicht-numerische Eingabe („abc") → Feld wird rot markiert (E-EK-01).
⚠ Edge:    „16000" → beim Verlassen „16'000.00".
```

```
AC-10 [Leerzustand]
✓ Gegeben: Dem Eigenkapital sind (noch) keine Konten zugeordnet.
✓ Wenn:    Der Treuhänder öffnet den Eigenkapitalnachweis.
✓ Dann:    Meldung „Dem Eigenkapital sind keine Konten zugewiesen" + Verweis auf die
           Kontenzuordnung. Keine Erfassung möglich, bis ≥ 1 EK-Kontogruppe zugeordnet ist.
```

```
AC-11 [Speichern (explizit)]
✓ Gegeben: Erfassungen sind geändert.
✓ Wenn:    Der Treuhänder klickt „Speichern".
✓ Dann:    Der Stand wird serverseitig als Entwurf gesichert.
✗ Fehler:  Zwischenzeitlich hat ein anderer Nutzer denselben Nachweis geändert
           (Version-Konflikt) → E-EK-02 (Optimistic-Lock-Konflikt), Hinweis zum Neu-Laden.
⚠ Edge:    Kein Auto-Save — ungesicherte Änderungen gehen bei Verlassen ohne Speichern verloren
           (Warnhinweis vor Verlassen).
```

```
AC-12 [Textblöcke Rich-Text + Rollforward]
✓ Gegeben: Vorjahr enthält einen Anmerkungstext.
✓ Wenn:    Das laufende Jahr geöffnet wird.
✓ Dann:    Der Vorjahrestext erscheint als editierbare Vorlage; Formatierung (fett/kursiv/
           unterstrichen, Listen) bleibt erhalten.
⚠ Edge:    Leerer Block → nur „hinzufügen"-Button, keine Toolbar.
```

```
AC-13 [Nicht-Abstimmung nicht blockierend]
✓ Gegeben: Eine Periode ist nicht vollständig abgestimmt (Differenz ≠ 0).
✓ Wenn:    Der Treuhänder speichert oder wechselt den Tab.
✓ Dann:    Speichern/Wechsel ist möglich; nicht abgestimmte Spalten bleiben orange.
⚠ Edge:    Im späteren Sign-Off/Abschluss erscheint eine Warnung (nicht Teil von v1),
           aber kein harter Block.
```

```
AC-14 [Auto-Aktualisierung aus der Kontenzuordnung]
✓ Gegeben: Der EK-Nachweis ist erfasst; Zielwerte stammen aus der Kontenzuordnung.
✓ Wenn:    Die Kontenzuordnung ändert sich (z.B. ein EK-Konto wird einer anderen Kontogruppe
           zugeordnet, oder ein Saldo-Re-Import ändert die Salden).
✓ Dann:    Anfangs-/Schlussbestand und die Abstimm-Zeilen aktualisieren sich automatisch —
           ohne dass der Treuhänder den EK-Nachweis manuell neu laden/anstossen muss.
✗ Fehler:  Eine zugeordnete EK-Kontogruppe fällt weg (die Mapping-Änderung ist erlaubt). Beim
           nächsten Öffnen des EK-Nachweises erscheint ein Informationsbanner, der den Wegfall
           kommuniziert. Die betroffene Spalte inkl. ihrer Bewegungen wird erst nach
           Bestätigung durch den Treuhänder gelöscht (E-EK-04).
⚠ Edge:    Änderung macht eine zuvor abgestimmte Periode wieder unstimmig → Abstimm-Zeile
           wechselt automatisch von ✓ auf orangen Restbetrag.
# Beispiel: Zielwert „Gewinnreserven" ändert sich durch Re-Import von 47'583'000.00 auf
#           47'600'000.00 → Differenz 17'000.00 erscheint automatisch, ohne Reload.
```

```
AC-15 [Info-Banner bei weggefallener Kontogruppe]
✓ Gegeben: Eine EK-Kontogruppe wurde im Mapping entfernt; auf ihrer Spalte sind Bewegungen erfasst.
✓ Wenn:    Der Treuhänder öffnet den EK-Nachweis erneut.
✓ Dann:    Ein Informationsbanner meldet den Wegfall der Kontogruppe „X" und bietet an, die
           Spalte inkl. ihrer Bewegungen zu löschen. Erst nach Bestätigung wird gelöscht (E-EK-04).
✗ Fehler:  Ohne Bestätigung bleibt der Banner; Spalte und Bewegungen bleiben unverändert erhalten.
⚠ Edge:    Kommt die Kontogruppe vor der Bestätigung zurück ins Mapping → Banner verschwindet,
           die Spalte bleibt regulär bestehen.
```

---

## 5. OR-Compliance

| OR-Artikel | Anforderung | Verbindlichkeit |
|---|---|---|
| OR 959b | Mindestgliederung Passiven inkl. Eigenkapital-Positionen (Grund-/Aktien-/Stamm-/Anteilscheinkapital, Kapital- und Gewinnreserven, eigene Kapitalanteile, Bilanzgewinn/-verlust). Die System-Spalten müssen diese Gliederung abbilden. | Zwingend |
| OR 959c | Anhang: Angaben zum Eigenkapital, eigene Anteile, wesentliche Ereignisse. Der Eigenkapitalnachweis dient als Grundlage der Anhang-Angaben. | Zwingend (Anhang) |
| Tabellarische Eigenkapitalveränderungsrechnung | Für OR-only KMU nicht zwingend, aber gängige Praxis / Teil des erweiterten Anhangs. Zwingend nur unter anerkanntem Standard (z.B. FER) oder im Konzernabschluss. | Praxisreferenz |

Kein FER/IAS-Verweis für OR-only KMU. Kapitalschutz (Art. 725a/725b) ist nicht Teil dieses
Features.

---

## 6. Haftungscheck

*Nicht anwendbar für v1.* Das Feature ist reine Bearbeitungs-UI im Entwurfsmodus. Es erzeugt
keinen finalen Output (kein PDF, kein Sign-Off, keine Versiegelung, keine Revision). Die
fachliche Verantwortung für die Werte liegt beim Treuhänder.

- **Output-Kennzeichnung:** Der Nachweis ist im Entwurfsmodus (`Entwurf`); ein „ENTWURF"-Label
  greift erst in der späteren Report-/PDF-Ansicht (nicht v1).
- **Audit-Trail:** Kein Audit-Trail in v1. Ein Änderungsprotokoll (wer/wann/welcher Stand)
  kommt erst mit dem Sign-Off-/Abschluss-Modul.
- **Hinweis:** Sobald PDF-Export oder Sign-Off ergänzt werden, wird der volle Haftungscheck
  Pflicht (siehe Critique).

---

## 7. Prototyp-Abweichungen

**Gilt NICHT für v1** (im Prototyp bzw. Umfeld sichtbar, aber bewusst ausgeschlossen):
- PDF-/Druck-/Report-Ansicht und Sign-Off.
- „Weiteres Geschäftsjahr ergänzen" — v1 zeigt genau zwei Perioden (VJ + laufendes Jahr).
- Automatische Vorbefüllung von Bewegungen (z.B. Jahresgewinn aus der Erfolgsrechnung,
  Gewinnvortrag aus der Gewinnverwendung) — alle Bewegungen sind in v1 manuell.
- Eigene Funktionalwährungs-Umrechnung im Eigenkapitalnachweis — Umrechnung ist vorgelagert.
- Zwischentotal-Zeilen (im Prototyp bereits entfernt).
- Auto-Save — v1 speichert nur auf expliziten Klick.
- Konzern-/Konsolidierungslogik — v1 ist Einzelabschluss. „Minderheitsanteile" erscheinen nur,
  wenn eine solche Kontogruppe existiert (datengetrieben), ohne eigene Konsolidierungsberechnung.

**Abweichung von `aumico-components`:**
- Der Prototyp nutzt eine eigene Teal-Farbe (`#0fa3a8`) und Schrift (Inter). Umsetzung mit den
  aumico-Design-Tokens (Teal `#2A9D8F`, Source Sans 3).
- Read-only-Felder im Prototyp: hellgrau. aumico-Konvention für schreibgeschützte Felder ist
  Teal-Hintergrund ohne Edit-Button — final gemäss `aumico-components`.
- Der Prototyp seedet zwei Standard-Total-Spalten vor. **v1-Entscheidung: Total-Spalten sind
  komplett manuell** — keine automatische Vorbelegung.
- Drag & Drop und Rich-Text im Prototyp sind Eigenbau (Wegwerf). Umsetzung mit
  aumico-Standard-Bausteinen ist Engineering-Sache.

Design ist nie pixelgenau — Layout und Funktion sind verbindlich, umgesetzt mit
`aumico-components` wo möglich.
