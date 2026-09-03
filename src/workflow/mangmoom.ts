import { insertTransportation } from "./expende";
import { parseDateFromText } from "../utils/date";

const MANGMOOM_API_BASE = "https://www.mangmoomemv.com/v1/mmemv-web";
const MAX_JOURNEY_PAGES = 10;

type MangmoomTokens = {
  accessToken: string;
  refreshToken: string;
  lumenSession?: string;
};

type MangmoomLoginResult = Partial<MangmoomTokens> & {
  isRequireOTP?: boolean;
  loginRef?: string;
};

type MangmoomCard = {
  cardId?: string;
  cardNumber?: string;
};

type MangmoomStation = {
  stationCode?: string;
  stationName?: string;
  dateForDispute?: string;
  date?: string;
};

type MangmoomJourney = {
  journeyId?: string;
  cardNumber?: string;
  from?: MangmoomStation | null;
  to?: MangmoomStation | null;
  date?: string;
  dateForDispute?: string;
  totalAmount?: number | string | null;
  statusText?: string;
  passName?: string | null;
};

type MangmoomListResponse<T> = {
  list?: T[];
};

type SyncResult = {
  inserted: number;
  skipped: number;
  skippedOutsideDate: number;
  fetchedPages: number;
  stoppedAfterTargetDate: boolean;
  date?: string;
  journeys: MangmoomJourney[];
  insertedExpenses: MangmoomInsertedExpense[];
};

export type MangmoomInsertedExpense = {
  source: string;
  amount: number;
  date?: string;
};

export async function syncMangmoomJourneysToNotion({
  kv,
  notionToken,
  expendeDatabaseId,
  email,
  password,
  cardId,
  date,
  pageNo = 1,
  pageSize = 50,
}: {
  kv: KVNamespace;
  notionToken: string;
  expendeDatabaseId: string;
  email: string;
  password: string;
  cardId?: string;
  date?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<SyncResult> {
  const client = new MangmoomClient();
  const loginResult = await client.login({ email, password, ref1: "" });
  if (loginResult.isRequireOTP) {
    throw new Error(
      `Mangmoom login requires OTP${loginResult.loginRef ? `: ${loginResult.loginRef}` : ""}`,
    );
  }

  const tokens = requireTokens(loginResult);

  const cards = cardId ? [{ cardId }] : await client.listCards(tokens);

  const {
    journeys,
    skippedOutsideDate,
    fetchedPages,
    stoppedAfterTargetDate,
  } = await fetchJourneysForDate({
    client,
    tokens,
    cards,
    date,
    pageNo,
    pageSize,
  });

  let inserted = 0;
  let skipped = 0;
  const insertedExpenses: MangmoomInsertedExpense[] = [];

  for (const journey of journeys) {
    const amount = toAmount(journey.totalAmount);
    if (!amount || amount <= 0) {
      skipped += 1;
      continue;
    }

    const dedupeKey = `mangmoom:${journey.journeyId ?? await sha256(JSON.stringify(journey))}`;
    const existing = await kv.get(dedupeKey);
    if (existing) {
      skipped += 1;
      continue;
    }

    const source = buildJourneySource(journey);
    const expenseDate = normalizeJourneyDate(journey);
    await insertTransportation(
      notionToken,
      expendeDatabaseId,
      source,
      amount,
      expenseDate,
    );
    await kv.put(dedupeKey, JSON.stringify(journey), {
      expirationTtl: 60 * 60 * 24 * 365,
    });
    insertedExpenses.push({
      source,
      amount,
      date: expenseDate,
    });
    inserted += 1;
  }

  return {
    inserted,
    skipped,
    skippedOutsideDate,
    fetchedPages,
    stoppedAfterTargetDate,
    date,
    journeys,
    insertedExpenses,
  };
}

async function fetchJourneysForDate({
  client,
  tokens,
  cards,
  date,
  pageNo,
  pageSize,
}: {
  client: MangmoomClient;
  tokens: MangmoomTokens;
  cards: MangmoomCard[];
  date?: string;
  pageNo: number;
  pageSize: number;
}) {
  const journeys: MangmoomJourney[] = [];
  let skippedOutsideDate = 0;
  let fetchedPages = 0;
  let stoppedAfterTargetDate = false;

  for (const card of cards) {
    if (!card.cardId) continue;

    let currentPageNo = pageNo;
    for (let pageCount = 0; pageCount < (date ? MAX_JOURNEY_PAGES : 1); pageCount += 1) {
      const pageJourneys = await client.listJourneys(tokens, {
        cardId: card.cardId,
        pageNo: currentPageNo,
        pageSize,
      });
      fetchedPages += 1;

      const result = filterJourneysByDate(pageJourneys, date);
      journeys.push(...result.journeys);
      skippedOutsideDate += result.skippedOutsideDate;

      if (
        result.stoppedAfterTargetDate ||
        pageJourneys.length === 0 ||
        pageJourneys.length < pageSize
      ) {
        stoppedAfterTargetDate ||= result.stoppedAfterTargetDate;
        break;
      }

      currentPageNo += 1;
    }
  }

  return {
    journeys,
    skippedOutsideDate,
    fetchedPages,
    stoppedAfterTargetDate,
  };
}

class MangmoomClient {
  async login(body: {
    email: string;
    password: string;
    ref1: string;
  }): Promise<MangmoomLoginResult> {
    const response = await this.requestWithHeaders<MangmoomLoginResult>(
      "/login",
      body,
    );
    return { ...response.body, ...getAuthCookiesFromHeaders(response.headers) };
  }

  async listCards(tokens: MangmoomTokens): Promise<MangmoomCard[]> {
    const response = await this.request<MangmoomListResponse<MangmoomCard> | MangmoomCard[]>(
      "/card",
      {},
      tokens,
    );
    return Array.isArray(response) ? response : response.list ?? [];
  }

  async listJourneys(
    tokens: MangmoomTokens,
    body: { cardId: string; pageNo: number; pageSize: number },
  ): Promise<MangmoomJourney[]> {
    const response = await this.request<
      MangmoomListResponse<{ travelDate?: string; journeys?: MangmoomJourney[] }>
    >("/journey", body, tokens);

    return (response.list ?? []).flatMap((group) =>
      (group.journeys ?? []).map((journey) => ({
        ...journey,
        date: journey.date ?? group.travelDate,
      }))
    );
  }

  private async request<T>(
    path: string,
    body: Record<string, unknown>,
    tokens?: Partial<MangmoomTokens>,
  ): Promise<T> {
    const response = await this.requestWithHeaders<T>(path, body, tokens);
    return response.body;
  }

  private async requestWithHeaders<T>(
    path: string,
    body: Record<string, unknown>,
    tokens?: Partial<MangmoomTokens>,
  ): Promise<{ body: T; headers: Headers }> {
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "Content-Language": "th_TH",
      "Origin": "https://www.mangmoomemv.com",
      "Referer": "https://www.mangmoomemv.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    };
    const cookie = buildAuthCookie(tokens);
    if (cookie) {
      headers.Cookie = cookie;
    }

    const response = await fetch(`${MANGMOOM_API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const responseText = await response.text();
    let payload: any;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new MangmoomApiError(
        `Mangmoom API ${path} returned non-JSON response`,
        response.status,
        {
          contentType: response.headers.get("content-type"),
          bodySnippet: responseText.slice(0, 200),
        },
      );
    }

    if (!response.ok) {
      throw new MangmoomApiError(
        `Mangmoom API ${path} failed: ${
          payload?.meta?.responseMessage ?? response.statusText
        }`,
        response.status,
        payload,
      );
    }

    return { body: (payload.data ?? payload) as T, headers: response.headers };
  }
}

export class MangmoomApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "MangmoomApiError";
  }
}

function buildJourneySource(journey: MangmoomJourney) {
  const from = formatStation(journey.from);
  const to = formatStation(journey.to);
  return `MRT ${from} -> ${to}`;
}

function formatStation(station?: MangmoomStation | null) {
  const stationName = station?.stationName ?? "Unknown station";
  return station?.stationCode ? `${stationName}(${station.stationCode})` : stationName;
}

function getJourneyDateCandidates(journey: MangmoomJourney) {
  return [
    journey.dateForDispute,
    journey.from?.dateForDispute,
    journey.to?.dateForDispute,
    journey.date,
    journey.from?.date,
    journey.to?.date,
  ];
}

function normalizeJourneyDate(journey: MangmoomJourney) {
  for (const rawDate of getJourneyDateCandidates(journey)) {
    if (!rawDate) continue;

    const isoDate = rawDate.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoDate) {
      return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
    }

    const parsedDate = parseDateFromText(rawDate);
    if (parsedDate) {
      return parsedDate;
    }
  }

  return undefined;
}

function filterJourneysByDate(journeys: MangmoomJourney[], date?: string) {
  if (!date) {
    return {
      journeys,
      skippedOutsideDate: 0,
      stoppedAfterTargetDate: false,
    };
  }

  const matchedJourneys: MangmoomJourney[] = [];
  let skippedOutsideDate = 0;
  let stoppedAfterTargetDate = false;

  for (const journey of journeys) {
    const journeyDate = normalizeJourneyDate(journey);
    if (journeyDate === date) {
      matchedJourneys.push(journey);
      continue;
    }

    skippedOutsideDate += 1;
    if (journeyDate && journeyDate < date) {
      stoppedAfterTargetDate = true;
      break;
    }
  }

  return {
    journeys: matchedJourneys,
    skippedOutsideDate,
    stoppedAfterTargetDate,
  };
}

function toAmount(amount: MangmoomJourney["totalAmount"]) {
  if (typeof amount === "number") return amount;
  if (!amount) return undefined;
  const numericAmount = Number(amount.toString().replace(/[^\d.]/g, ""));
  return Number.isFinite(numericAmount) ? numericAmount : undefined;
}

function getAuthCookiesFromHeaders(headers: Headers): Partial<MangmoomTokens> {
  const setCookie = headers.get("set-cookie");
  if (!setCookie) {
    return {};
  }

  const cookies = new Map<string, string>();
  for (const cookie of splitSetCookieHeader(setCookie)) {
    const [nameValue] = cookie.split(";");
    const separatorIndex = nameValue.indexOf("=");
    if (separatorIndex === -1) continue;

    cookies.set(
      nameValue.slice(0, separatorIndex).trim(),
      decodeURIComponent(nameValue.slice(separatorIndex + 1).trim()),
    );
  }

  return {
    accessToken: firstCookieValue(cookies, [
      "accessToken",
      "access_token",
      "access",
    ]),
    refreshToken: firstCookieValue(cookies, [
      "refreshToken",
      "refresh_token",
      "refresh",
    ]),
    lumenSession: firstCookieValue(cookies, ["lumen_session"]),
  };
}

function buildAuthCookie(tokens?: Partial<MangmoomTokens>) {
  if (!tokens) return undefined;

  return [
    ["accessToken", tokens.accessToken],
    ["refreshToken", tokens.refreshToken],
    ["lumen_session", tokens.lumenSession],
  ]
    .filter((cookie): cookie is [string, string] => !!cookie[1])
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

function splitSetCookieHeader(setCookie: string) {
  return setCookie.split(/,(?=\s*[^;,=\s]+=[^;,]*)/);
}

function firstCookieValue(cookies: Map<string, string>, names: string[]) {
  for (const name of names) {
    const value = cookies.get(name);
    if (value) return value;
  }
  return undefined;
}

function requireTokens(tokens: Partial<MangmoomTokens>): MangmoomTokens {
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error("Mangmoom response did not include auth tokens");
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    lumenSession: tokens.lumenSession,
  };
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
