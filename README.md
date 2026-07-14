# aumico · Eigenkapitalnachweis

Bearbeitungs-UI für den **Eigenkapitalnachweis**, eingebettet in die aumico-App-Shell
(Sidebar · Tabs · Projekt-Header). React + TypeScript + Vite.

Anfangs- und Schlussbestand jeder Periode kommen aus dem Kontenmapping (grau,
read-only); der User erfasst nur die Bewegungen dazwischen. Beide Geschäftsjahre
stehen je in einem eigenen Container. Eine „Differenz zu …"-Abstimmzeile wird grün
(✓), sobald Anfang + Bewegungen den Zielwert treffen.

## Features

- Zwei Geschäftsjahre, je in eigenem Container mit eigenem Spaltenkopf
- Spalten & Zeilen per **Pointer-Drag & Drop** sortierbar — die gezogene Spalte wird
  über die volle Höhe hervorgehoben, eine Einfügelinie zeigt das Ziel
- Spalten-Aktionen über ein **⋮-Menü** (Umbenennen / Verschieben / Löschen); alle
  manuell hinzugefügten Spalten sind löschbar, Mapping-Spalten sind geschützt
- **Total-Spalten** summieren die Wertspalten links davon
- Editierbare **Rich-Text-Blöcke** (Einleitung / Anmerkungen) mit Progressive
  Disclosure — Editor erscheint nur beim Bearbeiten oder wenn bereits Text vorhanden
- Schweizer Zahlenformat (Apostroph-Gruppierung, `−`, `–` für leer)

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Production-Build nach dist/
npm run preview  # Production-Build lokal ansehen
```

## Deployment (Vercel)

Zero-Config: Vercel erkennt Vite automatisch (Build `npm run build`, Output `dist`).
Repo unter [vercel.com/new](https://vercel.com/new) importieren und deployen — oder per
CLI: `npm i -g vercel && vercel --prod`.

## Struktur

| Datei | Zweck |
| --- | --- |
| `src/EigenkapitalnachweisEditor.tsx` | Das Feature: State, Mutationen, Drag & Drop, ⋮-Menü, Rich-Text, Rendering pro Periode |
| `src/EkReportModule.tsx` | Projekt-Header, die 8 Report-Tabs, Footer; mountet den Editor im `eigenkapital`-Tab |
| `src/App.tsx` | App-Shell + Report-Modul |
| `src/types.ts` · `src/seed.ts` · `src/format.ts` | Datenmodell, Seed-Daten, Zahlenformat |
| `src/eigenkapital.css` | Styles der Feature-Karte |
| `src/components/`, `src/styles/`, `src/assets/` | aumico-Shell + Design-System |
