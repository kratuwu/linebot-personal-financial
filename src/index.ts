import { Hono } from "hono";
import * as WorkFlow from "./workflow";
import { insertExpend } from "./workflow/expende";
import { parseGrabExpense } from "./workflow/grab";
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
    text?: string;
    subject?: string;
    secret?: string;
  }>();
  const secret = c.req.header("x-grab-webhook-secret") ?? payload.secret;

  if (c.env.GRAB_WEBHOOK_SECRET && secret !== c.env.GRAB_WEBHOOK_SECRET) {
    return c.text("unauthorized", 401);
  }

  const receiptText = [payload.subject, payload.text].filter(Boolean).join("\n");
  const expense = parseGrabExpense(receiptText);
  if (!expense) {
    return c.json({ ok: false, error: "Cannot parse Grab expense" }, 422);
  }

  const dedupeKey = `grab:${expense.referenceId ?? await sha256(receiptText)}`;
  const existingExpense = await c.env.KV.get(dedupeKey);
  if (existingExpense) {
    return c.json({ ok: true, skipped: true, expense });
  }

  const source = [expense.source, expense.referenceId]
    .filter(Boolean)
    .join(" ");

  await insertExpend(
    c.env.NOTION_TOKEN,
    c.env.EXPENDE_DATABASE_ID,
    expense.tag,
    source,
    expense.amount,
    expense.category,
    expense.date,
  );
  await c.env.KV.put(dedupeKey, JSON.stringify(expense), {
    expirationTtl: 60 * 60 * 24 * 90,
  });

  return c.json({ ok: true, expense });
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
