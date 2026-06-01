import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertTransportation } from "./expende";
import { syncMangmoomJourneysToNotion } from "./mangmoom";

vi.mock("./expende", () => ({
  insertTransportation: vi.fn(),
}));

describe("syncMangmoomJourneysToNotion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("logs in, uses auth cookies, and inserts only journeys for the requested date", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, {
        "set-cookie": [
          "accessToken=access-token; Path=/",
          "refreshToken=refresh-token; Path=/",
          "lumen_session=lumen-session; Path=/",
        ].join(", "),
      }))
      .mockResolvedValueOnce(jsonResponse({
        list: [{ cardId: "card-1" }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        list: [
          {
            travelDate: "2026-05-31",
            journeys: [
              {
                journeyId: "journey-1",
                from: { stationName: "Sukhumvit" },
                to: { stationName: "Silom" },
                totalAmount: "21.00",
                statusText: "Success",
              },
            ],
          },
          {
            travelDate: "2026-06-01",
            journeys: [
              {
                journeyId: "journey-2",
                from: { stationName: "Silom" },
                to: { stationName: "Sam Yan" },
                totalAmount: 18,
              },
            ],
          },
        ],
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncMangmoomJourneysToNotion({
      kv: createKv(),
      notionToken: "notion-token",
      expendeDatabaseId: "expense-db",
      email: "me@example.com",
      password: "password",
      date: "2026-05-31",
    });

    expect(result).toMatchObject({
      inserted: 1,
      skipped: 0,
      skippedOutsideDate: 1,
      date: "2026-05-31",
    });
    expect(insertTransportation).toHaveBeenCalledOnce();
    expect(insertTransportation).toHaveBeenCalledWith(
      "notion-token",
      "expense-db",
      "MRT Sukhumvit -> Silom (Success)",
      21,
      "2026-05-31",
    );

    expect(requestBody(fetchMock, 0)).toEqual({
      email: "me@example.com",
      password: "password",
      ref1: "",
    });
    expect(requestBody(fetchMock, 1)).toEqual({});
    expect(requestBody(fetchMock, 2)).toEqual({
      cardId: "card-1",
      pageNo: 1,
      pageSize: 50,
    });
    expect(requestCookie(fetchMock, 1)).toBe(
      "accessToken=access-token; refreshToken=refresh-token; lumen_session=lumen-session",
    );
  });

  it("skips duplicate and zero-amount journeys without inserting", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, {
        "set-cookie": [
          "accessToken=access-token; Path=/",
          "refreshToken=refresh-token; Path=/",
        ].join(", "),
      }))
      .mockResolvedValueOnce(jsonResponse({
        list: [{ cardId: "card-1" }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        list: [
          {
            travelDate: "2026-05-31",
            journeys: [
              {
                journeyId: "duplicate-journey",
                from: { stationName: "A" },
                to: { stationName: "B" },
                totalAmount: 42,
              },
              {
                journeyId: "zero-amount",
                from: { stationName: "C" },
                to: { stationName: "D" },
                totalAmount: 0,
              },
            ],
          },
        ],
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncMangmoomJourneysToNotion({
      kv: createKv(new Set(["mangmoom:duplicate-journey"])),
      notionToken: "notion-token",
      expendeDatabaseId: "expense-db",
      email: "me@example.com",
      password: "password",
      date: "2026-05-31",
    });

    expect(result).toMatchObject({
      inserted: 0,
      skipped: 2,
      skippedOutsideDate: 0,
    });
    expect(insertTransportation).not.toHaveBeenCalled();
  });

  it("matches Thai journey dates by falling back to dateForDispute", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, {
        "set-cookie": [
          "accessToken=access-token; Path=/",
          "refreshToken=refresh-token; Path=/",
        ].join(", "),
      }))
      .mockResolvedValueOnce(jsonResponse({
        list: [{ cardId: "card-1" }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        list: [
          {
            travelDate: "31 พ.ค. 2569",
            journeys: [
              {
                journeyId: "thai-date-journey",
                from: {
                  stationName: "ห้วยขวาง",
                  date: "31 พ.ค. 2569 | 16:24",
                  dateForDispute: "31/05/2026 | 16:24",
                },
                to: {
                  stationName: "สวนจตุจักร",
                  date: "31 พ.ค. 2569 | 16:41",
                  dateForDispute: "31/05/2026 | 16:41",
                },
                date: "31 พ.ค. 2569 | 16:24",
                dateForDispute: "31/05/2026 | 16:24",
                totalAmount: 27,
              },
            ],
          },
        ],
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncMangmoomJourneysToNotion({
      kv: createKv(),
      notionToken: "notion-token",
      expendeDatabaseId: "expense-db",
      email: "me@example.com",
      password: "password",
      date: "2026-05-31",
    });

    expect(result).toMatchObject({
      inserted: 1,
      skippedOutsideDate: 0,
    });
    expect(insertTransportation).toHaveBeenCalledWith(
      "notion-token",
      "expense-db",
      "MRT ห้วยขวาง -> สวนจตุจักร",
      27,
      "2026-05-31",
    );
  });

  it("throws when Mangmoom login requires OTP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({
      isRequireOTP: true,
      loginRef: "login-ref",
    })));

    await expect(syncMangmoomJourneysToNotion({
      kv: createKv(),
      notionToken: "notion-token",
      expendeDatabaseId: "expense-db",
      email: "me@example.com",
      password: "password",
    })).rejects.toThrow("Mangmoom login requires OTP: login-ref");
  });
});

function jsonResponse(data: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

function createKv(existingKeys = new Set<string>()) {
  const values = new Map([...existingKeys].map((key) => [key, "{}"]));
  return {
    get: vi.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve();
    }),
  } as unknown as KVNamespace;
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  return JSON.parse(fetchMock.mock.calls[callIndex][1].body as string);
}

function requestCookie(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  return fetchMock.mock.calls[callIndex][1].headers.Cookie;
}
