import type { EkData } from "./types";

// Seed state — identical to the prototype's seed().
export function seed(): EkData {
  return {
    uid: 30,
    cols: [
      { id: "c1", title: "Anteilscheinkapital", system: true, type: "value" },
      { id: "c2", title: "Zusatzanteilscheinkapital", system: true, type: "value" },
      { id: "c3", title: "Gewinnreserven", system: true, type: "value" },
      {
        id: "ct1",
        title: "Total Eigenkapital exkl. Minderheitsanteile",
        system: true,
        type: "total",
        sources: ["c1", "c2", "c3"],
      },
      { id: "c4", title: "Minderheitsanteile", system: true, type: "value" },
      {
        id: "ct2",
        title: "Total Eigenkapital inkl. Minderheitsanteile",
        system: true,
        type: "total",
        sources: ["c1", "c2", "c3", "c4"],
      },
    ],
    periods: [
      {
        id: "p2024",
        year: "2024",
        openLabel: "Eigenkapital per 1. Januar 2024",
        closeLabel: "Eigenkapital per 31. Dezember 2024",
        sysOpen: { c1: 1489000, c2: 5000000, c3: 40378000, c4: 119000 },
        sysClose: { c1: 1505000, c2: 5000000, c3: 47583000, c4: 222000 },
        manOpen: {},
        rows: [
          { id: "a1", type: "movement", title: "Zunahme Anteilscheinkapital", vals: { c1: "16'000.00" } },
          {
            id: "a2",
            type: "movement",
            title: "Jahresgewinn",
            vals: { c3: "7'455'000.00", c4: "103'000.00" },
          },
          {
            id: "a3",
            type: "movement",
            title: "Verzinsung Zusatzanteilscheinkapital",
            vals: { c3: "-250'000.00" },
          },
        ],
      },
      {
        id: "p2025",
        year: "2025",
        openLabel: "Eigenkapital per 1. Januar 2025",
        closeLabel: "Eigenkapital per 31. Dezember 2025",
        sysOpen: { c1: 1505000, c2: 5000000, c3: 47583000, c4: 222000 },
        sysClose: { c1: 1510000, c2: 5182000, c3: 52912000, c4: 329000 },
        manOpen: {},
        rows: [
          {
            id: "b1",
            type: "movement",
            title: "Zunahme Anteilscheinkapital",
            vals: { c1: "5'000.00", c2: "182'000.00" },
          },
          {
            id: "b2",
            type: "movement",
            title: "Jahresgewinn",
            vals: { c3: "5'579'000.00", c4: "107'000.00" },
          },
          {
            id: "b3",
            type: "movement",
            title: "Verzinsung Zusatzanteilscheinkapital",
            vals: { c3: "-250'000.00" },
          },
        ],
      },
    ],
  };
}
