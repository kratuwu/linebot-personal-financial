import { describe, expect, it, vi } from "vitest";

import { extendedGreenFare, greenFare } from "../farePolicy";
import { calculateGreenFare } from "../greenFareCalculator";

vi.mock("../farePolicy", () => ({
  greenFare: vi.fn((distance: number) => {
    if (distance === 0) return 17;
    if (distance === 1) return 17;
    if (distance === 2) return 25;
    return 47;
  }),
  extendedGreenFare: vi.fn((distance: number) => {
    if (distance === 0) return 17;
    if (distance === 1) return 17;
    if (distance === 2) return 22;
    if (distance === 3) return 24;
    return 45;
  }),
}));

vi.mock("../graph", () => ({
  isExtendedGreen: vi.fn((code: string) => {
    if (code === "CEN" || code === "W1") return false;

    const stationNumber = Number.parseInt(code.slice(1), 10);
    if (Number.isNaN(stationNumber)) return false;

    if (code.startsWith("N") || code.startsWith("S")) return stationNumber >= 9;
    if (code.startsWith("E")) return stationNumber >= 10;
    return false;
  }),
}));

describe("greenFareCalculator", () => {
  it("uses base green fare for a single station", () => {
    expect(calculateGreenFare(["CEN"])).toBe(17);
    expect(greenFare).toHaveBeenCalledWith(0);
  });

  it("uses base green fare before the extension boundary", () => {
    expect(calculateGreenFare(["N7", "N8"])).toBe(17);
    expect(greenFare).toHaveBeenCalledWith(1);
    expect(extendedGreenFare).not.toHaveBeenCalled();
  });

  it("combines base and extended fares after the extension boundary", () => {
    expect(calculateGreenFare(["N8", "N9", "N10"])).toBe(39);
    expect(greenFare).toHaveBeenCalledWith(0);
    expect(extendedGreenFare).toHaveBeenCalledWith(2);
  });

  it("prices one base stop plus the first extension stop as 34", () => {
    expect(calculateGreenFare(["S7", "S8", "S9"])).toBe(34);
    expect(greenFare).toHaveBeenCalledWith(1);
    expect(extendedGreenFare).toHaveBeenCalledWith(1);
  });

  it("uses one extension stop when a one-stop trip starts in the extension", () => {
    expect(calculateGreenFare(["S9", "S10"])).toBe(17);
    expect(extendedGreenFare).toHaveBeenCalledWith(1);
  });

  it("caps combined green fare at 65", () => {
    expect(calculateGreenFare(["N8", "N9", "N10", "N11", "N12"])).toBe(62);

    vi.mocked(greenFare).mockReturnValueOnce(40);
    vi.mocked(extendedGreenFare).mockReturnValueOnce(45);

    expect(calculateGreenFare(["N8", "N9", "N10", "N11", "N12"])).toBe(65);
  });
});
