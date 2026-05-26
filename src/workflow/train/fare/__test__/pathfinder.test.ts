import { beforeEach, describe, expect, it, vi } from "vitest";

import * as farePolicy from "../farePolicy";
import { buildPath } from "../pathfinder";

describe("pathfinder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses fare-policy line codes when pricing transfers", () => {
    const transferDiscount = vi.spyOn(farePolicy, "transferDiscount");

    const { pathes, cost } = buildPath("BL10", "PP15");

    expect(cost).toBe(19);
    expect(pathes).toContainEqual({
      type: "change",
      from: "BL10",
      to: "PP16",
      toLine: "purple",
    });
    expect(transferDiscount).toHaveBeenCalledWith("PP");
    expect(transferDiscount).not.toHaveBeenCalledWith("purple");
  });

  it("uses green extension fare logic for green-line segments", () => {
    const greenFare = vi.spyOn(farePolicy, "greenFare");
    const extendedGreenFare = vi.spyOn(farePolicy, "extendedGreenFare");

    const { pathes, cost } = buildPath("N8", "N10");

    expect(pathes).toEqual([
      {
        type: "segment",
        line: "green",
        from: "N8",
        to: "N10",
        stops: 2,
        stations: ["N8", "N9", "N10"],
      },
    ]);
    expect(cost).toBe(39);
    expect(greenFare).toHaveBeenCalledWith(0);
    expect(extendedGreenFare).toHaveBeenCalledWith(2);
  });
});
