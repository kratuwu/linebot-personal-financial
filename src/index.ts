import { Hono } from "hono";
import * as WorkFlow from "./workflow";
type Bindings = {
  CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  KV: KVNamespace;
  EXPENDE_DATABASE_ID: string;
  NOTION_TOKEN: string;
};
const app = new Hono<{ Bindings: Bindings }>();

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
