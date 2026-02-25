import { Elysia } from "elysia";
import { quickReplyMessages, replyMessage } from "./lineApi";
import * as WorkFlow from "./workflow";
import { insertConsumableExpende } from "./notionApi";

const app = new Elysia();


app.post("/webhook", async ({ request }) => {
  const body = await request.json();
  const event = body.events?.[0];
  if (!event) return new Response("No event");
  const {
    replyToken,
    source: { userId },
    type,
  } = event;
  if (type === "postback") {
    const params = new URLSearchParams(event.postback.data);
    const action = params.get("action");
    const process = params.get("process");
    if (action === "start") {
      if (process === "general") {
        await WorkFlow.startGeneralProcess(userId, replyToken, params.get("tag")!);
      } else if (process === "train") {
        await WorkFlow.startProcessTrain(userId, replyToken);
      } else if (process === "manual") {
        await WorkFlow.startProcessManual(userId, replyToken, params.get("category")!);
      }
    } else if (action === "train") {
      await WorkFlow.processTrain(userId, replyToken, params);
    } else if(action === "tag") {
      await WorkFlow.processSetTag(userId, replyToken, params.get("tag")!);
    }
  } else if (type === "message" && event.message.type === "text") {
    await WorkFlow.processTextMessage(userId, replyToken, event.message.text);
  }
  return new Response("OK");
});

app.listen(3000);

console.log("server running at http://localhost:3000");
