import { describe, expect, it } from "vitest";
import { buildGrabExpense } from "./grab";

describe("buildGrabExpense", () => {
  it("builds a structured GrabFood expense", () => {
    const result = buildGrabExpense({
      service: "GrabFood",
      source: "บ้านลุงแป๊ะ - คลองเตย",
      amount: 44,
      date: "2026-05-27",
      referenceId: "A-9DXW3G3WWP8SAV",
    });

    expect(result).toEqual({
      source: "GrabFood - บ้านลุงแป๊ะ - คลองเตย",
      amount: 44,
      tag: "Dining Out",
      category: "Consumable",
      referenceId: "A-9DXW3G3WWP8SAV",
      date: "2026-05-27",
    });
  });

  it("builds a structured GrabCar expense", () => {
    const result = buildGrabExpense({
      service: "GrabCar",
      source: "Home to Central Rama 9",
      amount: 132,
    });

    expect(result).toMatchObject({
      source: "GrabCar - Home to Central Rama 9",
      amount: 132,
      tag: "Transportation",
      category: "Consumable",
    });
  });

  it("does not double-prefix the source", () => {
    const result = buildGrabExpense({
      service: "GrabFood",
      source: "GrabFood - บ้านลุงแป๊ะ - คลองเตย",
      amount: 44,
    });

    expect(result?.source).toBe("GrabFood - บ้านลุงแป๊ะ - คลองเตย");
  });

  it("rejects invalid structured expenses", () => {
    expect(buildGrabExpense({ service: "GrabFood" })).toBeNull();
    expect(buildGrabExpense({ amount: 44 })).toBeNull();
    expect(buildGrabExpense({ service: "Uber", amount: 44 })).toBeNull();
    expect(buildGrabExpense({ service: "GrabFood", amount: 0 })).toBeNull();
  });
});
