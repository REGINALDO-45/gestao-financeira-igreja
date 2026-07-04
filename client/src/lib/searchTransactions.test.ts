import { describe, expect, it } from "vitest";
import { matchesSearch } from "./searchTransactions";

describe("matchesSearch", () => {
  it("matches when any field contains the query, case-insensitively", () => {
    expect(matchesSearch("joão", ["Dízimo mensal", "João Silva"])).toBe(true);
    expect(matchesSearch("JOÃO", ["Dízimo mensal", "João Silva"])).toBe(true);
  });

  it("returns false when no field contains the query", () => {
    expect(matchesSearch("maria", ["Dízimo mensal", "João Silva"])).toBe(false);
  });

  it("treats an empty or whitespace-only query as matching everything", () => {
    expect(matchesSearch("", ["qualquer coisa"])).toBe(true);
    expect(matchesSearch("   ", ["qualquer coisa"])).toBe(true);
  });

  it("tolerates null/undefined fields", () => {
    expect(matchesSearch("silva", [null, undefined, "João Silva"])).toBe(true);
  });
});
