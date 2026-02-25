import { quickReplyMessages, replyMessage } from "../lineApi";
import * as Train from "./train";
import tags from "./tags.json";
import { insertExpend, insertTransportation } from "./expende";
const userStates = new Map<
  string,
  {
    tag?: string;
    stage: string;
    category?: string;
    source?: string;
  }
>();

export async function startProcessTrain(userId: any, replyToken: any) {
  userStates.set(userId, {
    stage: "WAIT_STATION",
    tag: "tea",
  });
  await Train.replySuggestPath(userId, replyToken);
}

export async function processTrain(
  userId: string,
  replyToken: string,
  params: URLSearchParams,
) {
  const process = params.get("process");
  if (process === "set_route") {
    await Train.replyRouteConfirmation(
      userId,
      replyToken,
      params.get("origin")!,
      params.get("dest")!,
    );
    userStates.delete(userId);
  } else if (process === "set_origin") {
    await Train.setTrainOrigin(userId, params, replyToken);
  } else if (process === "confirm_fare") {
    const replyText = `${params.get("origin")} -> ${params.get("dest")}`;
    await Train.replyConfirmFare(replyToken);
    await insertTransportation(replyText, parseInt(params.get("fare")!));
    userStates.delete(userId);
  } else if (process === "cancel_fare") {
    await Train.replyCancelFare(userId, replyToken);
    userStates.delete(userId);
  }
}

export async function startProcessManual(
  userId: string,
  replyToken: string,
  category: string,
) {
  userStates.set(userId, {
    stage: "WAIT_TAG",
    category,
  });
  await quickReplyMessages(
    replyToken,
    "กรุณาเลือกtag",
    tags.map((tag) => ({
      type: "action",
      action: {
        type: "postback",
        label: tag,
        data: `action=tag&tag=${tag}`,
      },
    })),
  );
}

export async function processTextMessage(
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = userStates.get(userId);
  if (userState?.stage === "WAIT_TAG") {
    return await processSetTag(userId, replyToken, text);
  }
  if (userState?.stage === "WAIT_SOURCE") {
    return await processSetSource(userId, replyToken, text);
  }
  if (userState?.stage === "WAIT_AMOUNT") {
    return await processAmount(userId, replyToken, text)
  }
  if (userState?.stage === "WAIT_STATION") {
    return await Train.processTrainStationSearch(userId, replyToken, text);
  }
}
export async function startGeneralProcess(userId: any, replyToken: any, tag: any){
  userStates.set(userId, {stage: "WAIT_SOURCE"});
  await processSetTag(userId, replyToken, tag);
}

export async function processSetTag(userId: any, replyToken: any, tag: any) {
  const userState = userStates.get(userId)!;
  userStates.set(userId, {
    stage: "WAIT_SOURCE",
    category: userState.category,
    tag: tag,
  });
  await replyMessage(replyToken, "กรุณาใส่รายละเอียด");
}

async function processSetSource(userId: string, replyToken: string, text: string) {
  const userState = userStates.get(userId)!;

  userStates.set(userId, {
    stage: "WAIT_AMOUNT",
    source: text,
    category: userState.category,
  });
  return replyMessage(replyToken, "กรุณาใส่จำนวนเงิน");
}

async function processAmount(userId: string, replyToken: string, amount: string) {
  const clean = amount.replace(/[^\d.]/g, "");
  const cleanAmount = Number(clean);

  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    await replyMessage(replyToken, "กรุณาใส่ตัวเลขที่ถูกต้อง");
  }
  const userState = userStates.get(userId)!;
  await insertExpend(
    userState.tag!,
    userState.source!,
    cleanAmount,
    userState.category!,
  );
  userStates.delete(userId);
}