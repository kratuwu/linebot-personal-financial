import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pushMessage } from "./lineApi";
import {
  notifyGrabInsertedExpense,
  notifyMangmoomInsertedExpenses,
} from "./notifications";

vi.mock("./lineApi", () => ({
  pushMessage: vi.fn(),
}));

describe("notifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes a Grab expense notification to the personal LINE ID", async () => {
    await notifyGrabInsertedExpense(
      {
        LINE_CHANNEL_ACCESS_TOKEN: "line-token",
        PERSONAL_LINE_ID: "line-user-id",
      },
      {
        source: "GrabFood - Bluekoff Coffee",
        amount: 95.5,
        tag: "Coffee",
        category: "Consumable",
        date: "2026-06-03",
      },
    );

    expect(pushMessage).toHaveBeenCalledOnce();
    expect(pushMessage).toHaveBeenCalledWith(
      "line-token",
      "line-user-id",
      [
        "บันทึกค่าใช้จ่าย Grab เข้า Notion แล้ว",
        "GrabFood - Bluekoff Coffee: 95.50 บาท",
        "Coffee / Consumable (2026-06-03)",
      ].join("\n"),
    );
  });

  it("pushes a Mangmoom summary with inserted expense details", async () => {
    await notifyMangmoomInsertedExpenses(
      {
        LINE_CHANNEL_ACCESS_TOKEN: "line-token",
        PERSONAL_LINE_ID: "line-user-id",
      },
      {
        inserted: 2,
        insertedExpenses: [
          {
            source: "MRT Sukhumvit(BL22) -> Silom(BL26)",
            amount: 21,
            date: "2026-06-02",
          },
          {
            source: "MRT Silom(BL26) -> Sam Yan(BL27)",
            amount: 18.5,
            date: "2026-06-02",
          },
        ],
      },
    );

    expect(pushMessage).toHaveBeenCalledOnce();
    expect(pushMessage).toHaveBeenCalledWith(
      "line-token",
      "line-user-id",
      [
        "บันทึกค่าเดินทาง Mangmoom เข้า Notion แล้ว",
        "2 รายการ รวม 39.50 บาท",
        "- MRT Sukhumvit(BL22) -> Silom(BL26): 21 บาท (2026-06-02)",
        "- MRT Silom(BL26) -> Sam Yan(BL27): 18.50 บาท (2026-06-02)",
      ].join("\n"),
    );
  });

  it("does not push when notification config is missing", async () => {
    await notifyGrabInsertedExpense(
      { LINE_CHANNEL_ACCESS_TOKEN: "line-token" },
      {
        source: "GrabCar - Home",
        amount: 120,
        tag: "Transportation",
        category: "Consumable",
      },
    );
    await notifyMangmoomInsertedExpenses(
      { PERSONAL_LINE_ID: "line-user-id" },
      {
        inserted: 1,
        insertedExpenses: [
          {
            source: "MRT A -> B",
            amount: 21,
          },
        ],
      },
    );

    expect(pushMessage).not.toHaveBeenCalled();
  });

  it("does not push when Mangmoom inserted no expenses", async () => {
    await notifyMangmoomInsertedExpenses(
      {
        LINE_CHANNEL_ACCESS_TOKEN: "line-token",
        PERSONAL_LINE_ID: "line-user-id",
      },
      {
        inserted: 0,
        insertedExpenses: [],
      },
    );

    expect(pushMessage).not.toHaveBeenCalled();
  });
});
