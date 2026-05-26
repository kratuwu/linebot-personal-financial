import { describe, expect, it } from "vitest";

import {
  GRAPH,
  getLine,
  isExtendedGreen,
  normalize,
} from "../graph";

describe("graph", () => {
  it("connects station ranges and interchanges bidirectionally", () => {
    expect(GRAPH.BL01).toEqual(
      expect.arrayContaining(["BL02", "BL32", "BL33"])
    );
    expect(GRAPH.BL32).toContain("BL01");
    expect(GRAPH.BL33).toContain("BL01");

    expect(GRAPH.BL10).toContain("PP16");
    expect(GRAPH.PP16).toContain("BL10");

    expect(GRAPH.PK10).toContain("MT01");
    expect(GRAPH.MT01).toContain("PK10");
  });

  it("normalizes station aliases shared by interchanges", () => {
    expect(normalize("BL10")).toBe("TAOPOON");
    expect(normalize("PP16")).toBe("TAOPOON");
    expect(normalize("E4")).toBe("ASOK");
    expect(normalize("UNKNOWN")).toBe("UNKNOWN");
  });

  it("classifies lines for generated station codes", () => {
    expect(getLine("BL01")).toBe("blue");
    expect(getLine("PP01")).toBe("purple");
    expect(getLine("PK10")).toBe("pink");
    expect(getLine("MT01")).toBe("pink");
    expect(getLine("YL01")).toBe("yellow");
    expect(getLine("CEN")).toBe("green");
    expect(getLine("E10")).toBe("green");
  });

  it("detects green-line extension stations by branch boundary", () => {
    expect(isExtendedGreen("N8")).toBe(false);
    expect(isExtendedGreen("N9")).toBe(true);
    expect(isExtendedGreen("S8")).toBe(false);
    expect(isExtendedGreen("S9")).toBe(true);
    expect(isExtendedGreen("E9")).toBe(false);
    expect(isExtendedGreen("E10")).toBe(true);
    expect(isExtendedGreen("CEN")).toBe(false);
    expect(isExtendedGreen("W1")).toBe(false);
  });
});
