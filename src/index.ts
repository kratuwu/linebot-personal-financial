import { Hono } from "hono";
import * as WorkFlow from "./workflow";

type Bindings = {
  CHANNEL_SECRET: string;
  CHANNEL_ACCESS_TOKEN: string;
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
  const accessToken = c.env.CHANNEL_ACCESS_TOKEN;
  if (type === "postback") {
    const params = new URLSearchParams(event.postback.data);
    const action = params.get("action");
    const process = params.get("process");
    if (action === "start") {
      if (process === "general") {
        await WorkFlow.startGeneralProcess(
          accessToken,
          userId,
          replyToken,
          params.get("tag"),
        );
      } else if (process === "train") {
        await WorkFlow.startProcessTrain(accessToken, userId, replyToken);
      } else if (process === "manual") {
        await WorkFlow.startProcessManual(
          accessToken,
          userId,
          replyToken,
          params.get("category")!,
        );
      }
    } else if (action === "train") {
      await WorkFlow.processTrain(accessToken, userId, replyToken, params);
    } else if (action === "tag") {
      await WorkFlow.processSetTag(
        accessToken,
        userId,
        replyToken,
        params.get("tag"),
      );
    }
  } else if (type === "message" && event.message.type === "text") {
    await WorkFlow.processTextMessage(
      accessToken,
      userId,
      replyToken,
      event.message.text,
    );
  }
  console.log({isMessage: type === "message",isText: event.message.type === "text"})
  return c.text("OK");
});

export default app;
