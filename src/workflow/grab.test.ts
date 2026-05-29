import { describe, expect, it } from "vitest";
import { parseGrabExpense } from "./grab";

describe("parseGrabExpense", () => {
  it("parses a GrabFood receipt with a merchant and total", () => {
    const result = parseGrabExpense(`
      GrabFood
      Restaurant: Khao Man Gai Pratunam
      Total paid
      ฿145.50
    `);

    expect(result).toEqual({
      source: "GrabFood - Khao Man Gai Pratunam",
      amount: 145.5,
      tag: "Dining Out",
      category: "Consumable",
      referenceId: undefined,
      date: undefined,
    });
  });

  it("parses a GrabCar receipt as transportation", () => {
    const result = parseGrabExpense(`
      GrabCar
      Fare: THB 87
    `);

    expect(result).toEqual({
      source: "GrabCar",
      amount: 87,
      tag: "Transportation",
      category: "Consumable",
      referenceId: undefined,
      date: undefined,
    });
  });

  it("parses a reference id for deduplication", () => {
    const result = parseGrabExpense(`
      GrabFood
      Booking code: A-123ABC
      Total paid ฿99
    `);

    expect(result?.referenceId).toBe("A-123ABC");
  });

  it("uses origin as the source when present", () => {
    const result = parseGrabExpense(`
      GrabFood
      Origin: McDonald's Samyan Mitrtown
      Total paid ฿149
    `);

    expect(result?.source).toBe("GrabFood - McDonald's Samyan Mitrtown");
  });

  it("uses Thai trip start location as the source", () => {
    const result = parseGrabExpense(`
      GrabFood
      สถานที่เริ่มต้นการเดินทาง
      KFC Central Rama 9
      Total paid ฿149
    `);

    expect(result?.source).toBe("GrabFood - KFC Central Rama 9");
  });

  it("uses origin and destination for ride sources", () => {
    const result = parseGrabExpense(`
      GrabCar
      Origin
      Home
      Destination
      Central Rama 9
      Fare: THB 132
    `);

    expect(result?.source).toBe("GrabCar - Home to Central Rama 9");
  });

  it("does not use email sender lines as merchant source", () => {
    const result = parseGrabExpense(`
      From: Grab <no-reply@grab.com>
      GrabFood
      Booking code: A-9DXW3G3WWP8SAV
      Total paid ฿44
    `);

    expect(result?.source).toBe("GrabFood");
  });

  it("parses a numeric receipt date", () => {
    const result = parseGrabExpense(`
      GrabCar
      Date: 28/05/2026
      Fare: THB 87
    `);

    expect(result?.date).toBe("2026-05-28");
  });

  it("parses an English month receipt date", () => {
    const result = parseGrabExpense(`
      GrabFood
      Order date
      29 May 2026
      Total paid ฿120
    `);

    expect(result?.date).toBe("2026-05-29");
  });

  it("ignores text that is not from Grab", () => {
    expect(parseGrabExpense("Lunch 120 baht")).toBeNull();
  });
});
