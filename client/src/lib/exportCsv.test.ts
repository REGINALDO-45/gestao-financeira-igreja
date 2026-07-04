import { describe, expect, it } from "vitest";
import { buildCsv } from "./exportCsv";

describe("buildCsv", () => {
  it("builds a header row plus one row per item", () => {
    const rows = [
      { name: "João", amount: 500 },
      { name: "Maria", amount: 1240 },
    ];
    const csv = buildCsv(rows, [
      { header: "Nome", value: (r) => r.name },
      { header: "Valor", value: (r) => r.amount.toFixed(2) },
    ]);
    expect(csv).toBe("Nome,Valor\nJoão,500.00\nMaria,1240.00");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    const rows = [{ text: 'Contém "aspas", vírgula e\nquebra' }];
    const csv = buildCsv(rows, [{ header: "Texto", value: (r) => r.text }]);
    expect(csv).toBe('Texto\n"Contém ""aspas"", vírgula e\nquebra"');
  });

  it("returns just the header when there are no rows", () => {
    const csv = buildCsv([], [{ header: "Nome", value: () => "" }]);
    expect(csv).toBe("Nome");
  });
});
