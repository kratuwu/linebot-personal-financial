import { Hono } from "hono";
import * as WorkFlow from "./workflow";
import { insertExpend } from "./workflow/expende";
import { buildGrabExpense } from "./workflow/grab";
type Bindings = {
  CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  KV: KVNamespace;
  EXPENDE_DATABASE_ID: string;
  NOTION_TOKEN: string;
  GRAB_WEBHOOK_SECRET?: string;
};
const app = new Hono<{ Bindings: Bindings }>();

app.post("/grab/webhook", async (c) => {
  const payload = await c.req.json<{
    service?: string;
    source?: string;
    amount?: number | string;
    date?: string;
    referenceId?: string;
    subject?: string;
    secret?: string;
  }>();
  const secret = c.req.header("x-grab-webhook-secret") ?? payload.secret;

  if (c.env.GRAB_WEBHOOK_SECRET && secret !== c.env.GRAB_WEBHOOK_SECRET) {
    return c.text("unauthorized", 401);
  }

  if (!c.env.NOTION_TOKEN || !c.env.EXPENDE_DATABASE_ID) {
    return c.json(
      { ok: false, error: "Missing Notion Worker configuration" },
      500,
    );
  }

  const amount = toOptionalAmount(payload.amount);
  const expense = buildGrabExpense({
    service: payload.service,
    amount,
    date: payload.date,
    source: payload.source,
    referenceId: payload.referenceId,
  });
  if (!expense) {
    return c.json(
      {
        ok: false,
        error: "Invalid Grab expense payload",
        subject: payload.subject,
      },
      422,
    );
  }

  const savedExpense = expense;

  const dedupeKey = `grab:${expense.referenceId ?? await sha256(JSON.stringify({
    service: payload.service,
    source: payload.source,
    amount: expense.amount,
    date: expense.date,
    subject: payload.subject,
  }))}`;
  const existingExpense = await c.env.KV.get(dedupeKey);
  if (existingExpense) {
    return c.json({
      ok: true,
      inserted: false,
      skipped: true,
      reason: "duplicate",
      expense: savedExpense,
    });
  }

  let page;
  try {
    page = await insertExpend(
      c.env.NOTION_TOKEN,
      c.env.EXPENDE_DATABASE_ID,
      expense.tag,
      expense.source,
      expense.amount,
      expense.category,
      expense.date,
    );
  } catch (error) {
    console.error("Failed to save Grab expense to Notion", error);
    return c.json(
      {
        ok: false,
        error: "Failed to save Grab expense to Notion",
        expense: savedExpense,
      },
      500,
    );
  }

  await c.env.KV.put(dedupeKey, JSON.stringify(savedExpense), {
    expirationTtl: 60 * 60 * 24 * 90,
  });

  return c.json({
    ok: true,
    inserted: true,
    notionPageId: page.id,
    expense: savedExpense,
  });
});

app.post("/webhook", async (c) => {
  const signature = c.req.header("x-line-signature");
  if (!signature) {
    return c.text("missing signature", 400);
  }
  const body = await c.req.json();
  const event = body.events?.[0];
  const {
    replyToken,
    source: { userId },
    type,
  } = event;
  const accessToken = c.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (type === "postback") {
    const params = new URLSearchParams(event.postback.data);
    const action = params.get("action");
    const process = params.get("process");
    if (action === "start") {
      if (process === "general") {
        await WorkFlow.startGeneralProcess(
          c.env.KV,
          accessToken,
          userId,
          replyToken,
          params.get("tag"),
          params.get("category")!,
        );
      } else if (process === "train") {
        await WorkFlow.startTrainProcess(
          c.env.KV,
          accessToken,
          userId,
          replyToken,
        );
      } else if (process === "manual") {
        await WorkFlow.startProcessManual(
          accessToken,
          replyToken,
          params.get("category")!,
        );
      }
    } else if (action === "train") {
      await WorkFlow.processTrain(
        c.env.KV,
        accessToken,
        userId,
        replyToken,
        c.env.NOTION_TOKEN,
        c.env.EXPENDE_DATABASE_ID,
        params,
      );
    } else if (action === "general") {
      await WorkFlow.processGeneral(
        accessToken,
        replyToken,
        c.env.NOTION_TOKEN,
        c.env.EXPENDE_DATABASE_ID,
        params,
      );
    }
  } else if (type === "message" && event.message.type === "text") {
    await WorkFlow.processTextMessage(
      c.env.KV,
      accessToken,
      userId,
      replyToken,
      event.message.text,
    );
  }
  return c.text("OK");
});

export default app;

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toOptionalAmount(amount: number | string | undefined) {
  if (amount === undefined || amount === null || amount === "") {
    return undefined;
  }

  const numericAmount = typeof amount === "number"
    ? amount
    : Number(amount.replace(/[^\d.]/g, ""));

  return Number.isFinite(numericAmount) && numericAmount > 0
    ? numericAmount
    : undefined;
}
