import { describe, expect, test } from "bun:test";
import { parsePrice, parseQuickEntry } from "./price.ts";

describe("parseQuickEntry", () => {
  test.each([
    ["banh mi 30k", "banh mi", 30_000],
    ["Kem bơ 49K", "Kem bơ", 49_000],
    ["taxi 80000", "taxi", 80_000],
    ["homestay 1.5tr", "homestay", 1_500_000],
    ["Bún bò 2 tô 60k", "Bún bò 2 tô", 60_000],
    ["  sữa   60k  ", "sữa", 60_000],
    ["vé 1,5tr", "vé", 1_500_000],
  ])("%p parses", (line, name, amount) => {
    expect(parseQuickEntry(line)).toEqual({ ok: true, value: { name, amount } });
  });

  test.each([
    ["banh mi", "no price"],
    ["30k banh mi", "price first"],
    ["banh mi 30 k", "suffix split from number"],
    ["banh mi 30.000", "separator without suffix"],
    ["banh mi 30,000", "comma separator without suffix"],
    ["x 1.2345k", "not a whole number"],
    ["x 0k", "zero"],
    ["30k", "no name"],
    ["", "empty"],
  ])("%p fails (%s)", (line) => {
    expect(parseQuickEntry(line).ok).toBe(false);
  });
});

describe("parsePrice", () => {
  test("accepts a suffix with a decimal", () => {
    expect(parsePrice("2.5k")).toEqual({ ok: true, value: 2_500 });
  });

  test("rejects a negative or signed price", () => {
    expect(parsePrice("-30k").ok).toBe(false);
    expect(parsePrice("+30k").ok).toBe(false);
  });

  test("rejects amounts beyond the safe integer range", () => {
    expect(parsePrice("99999999999999999tr").ok).toBe(false);
  });
});

test.each([["1.0000000000000001k"], ["1.00000000000000001k"], ["1.0000000000000001tr"], ["1.0001k"]])(
  "%p is rejected instead of rounded",
  (token) => {
    expect(parsePrice(token).ok).toBe(false);
  },
);

test("keeps exact values with a long but whole fraction", () => {
  expect(parsePrice("1.500000tr")).toEqual({ ok: true, value: 1_500_000 });
});
