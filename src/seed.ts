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
      },
      { id: "c4", title: "Minderheitsanteile", system: true, type: "value" },
      {
        id: "ct2",
        title: "Total Eigenkapital inkl. Minderheitsanteile",
        system: true,
        type: "total",
      },
    ],
    periods: [
      {
        id: "p2024",
        year: "2024",
        openLabel: "Eigenkapital per 1. Januar 2024",
        closeLabel: "Eigenkapital per 31. Dezember 2024",
        sysOpen: { c1: 1489, c2: 5000, c3: 40378, c4: 119 },
        sysClose: { c1: 1505, c2: 5000, c3: 47583, c4: 222 },
        manOpen: {},
        rows: [
          { id: "a1", type: "movement", title: "Zunahme Anteilscheinkapital", vals: { c1: "16" } },
          { id: "a2", type: "movement", title: "Jahresgewinn", vals: { c3: "7455", c4: "103" } },
          {
            id: "a3",
            type: "movement",
            title: "Verzinsung Zusatzanteilscheinkapital",
            vals: { c3: "-250" },
          },
        ],
      },
      {
        id: "p2025",
        year: "2025",
        openLabel: "Eigenkapital per 1. Januar 2025",
        closeLabel: "Eigenkapital per 31. Dezember 2025",
        sysOpen: { c1: 1505, c2: 5000, c3: 47583, c4: 222 },
        sysClose: { c1: 1510, c2: 5182, c3: 52912, c4: 329 },
        manOpen: {},
        rows: [
          {
            id: "b1",
            type: "movement",
            title: "Zunahme Anteilscheinkapital",
            vals: { c1: "5", c2: "182" },
          },
          { id: "b2", type: "movement", title: "Jahresgewinn", vals: { c3: "5579", c4: "107" } },
          {
            id: "b3",
            type: "movement",
            title: "Verzinsung Zusatzanteilscheinkapital",
            vals: { c3: "-250" },
          },
        ],
      },
    ],
  };
}
