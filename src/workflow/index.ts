import { quickReplyMessages, replyFlex, replyMessage } from "../lineApi";
import * as Train from "./train";
import tags from "./tags.json";
import { insertExpend, insertTransportation } from "./expende";
type UserState = {
  tag?: string;
  state: string;
  category?: string;
  source?: string;
};

export async function startProcessTrain(
  kv: KVNamespace,
  accessToken: string,
  userId: any,
  replyToken: any,
) {
  await kv.put(
    userId,
    JSON.stringify({
      state: "WAIT_STATION",
      tag: "transportation",
    }),
  );
  const sugestStation = await Train.processSuggestPath(kv, userId);
  console.log(sugestStation);
  await quickReplyMessages(
    accessToken,
    replyToken,
    "เลือกรูทที่ใช้บ่อย หรือพิมพ์ต้นทางเอง",
    sugestStation,
  );
}

export async function processTrain(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  params: URLSearchParams,
) {
  const process = params.get("process");
  console.log(process);
  if (process === "set_route") {
    const flexMessage = Train.getConfirmationFlex(
      params.get("origin")!,
      params.get("dest")!,
    );
    await replyFlex(accessToken, replyToken, [flexMessage]);
    await kv.delete(userId);
  } else if (process === "set_origin") {
    await Train.setTrainOrigin(kv, userId, params.get("origin")!);
    await replyMessage(
      accessToken,
      replyToken,
      `ต้นทาง: ${params.get("origin")} กรุณาใส่ปลายทาง`,
    );
  } else if (process === "confirm_fare") {
    const replyText = `${params.get("origin")} -> ${params.get("dest")}`;
    await replyMessage(accessToken, replyToken, "บันทึกค่าเดินทางเรียบร้อย");
    await insertTransportation(replyText, parseInt(params.get("fare")!));
    kv.delete(userId);
  } else if (process === "cancel_fare") {
    await replyMessage(accessToken, replyToken, "ยกเลิกการบันทึกค่าเดินทาง");
    kv.delete(userId);
  }
}

export async function startProcessManual(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  category: string,
) {
  await kv.put(
    userId,
    JSON.stringify({
      state: "WAIT_TAG",
      category,
    }),
  );
  await quickReplyMessages(
    accessToken,
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
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = await kv.get<UserState>(userId, "json");
  console.log({ userState });
  if (userState?.state === "WAIT_TAG") {
    return await processSetTag(kv, accessToken, userId, replyToken, text);
  }
  if (userState?.state === "WAIT_SOURCE") {
    return await processSetSource(kv, accessToken, userId, replyToken, text);
  }
  if (userState?.state === "WAIT_AMOUNT") {
    return await processAmount(kv, accessToken, userId, replyToken, text);
  }
  if (userState?.state === "WAIT_STATION") {
    return await processSearchStation(kv, accessToken, replyToken, userId, text);
  }
}

export async function startGeneralProcess(
  kv: KVNamespace,
  accessToken: string,
  userId: any,
  replyToken: any,
  tag: any,
) {
  await kv.put(
    userId,
    JSON.stringify({
      state: "WAIT_SOURCE",
      category: "consumable",
      tag: tag,
    }),
  );
  await replyMessage(accessToken, replyToken, "กรุณาใส่รายละเอียด");
}
export async function processSetTag(
  kv: KVNamespace,
  accessToken: string,
  userId: any,
  replyToken: any,
  tag: any,
) {
  const userState = await kv.get<UserState>(userId);
  await kv.put(userId, JSON.stringify({
    state: "WAIT_SOURCE",
    category: userState?.category,
    tag: tag,
  }));
  await replyMessage(accessToken, replyToken, "กรุณาใส่รายละเอียด");
}

async function processSetSource(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = await kv.get<UserState>(userId, "json")!;

  await kv.put(userId, JSON.stringify({
    state: "WAIT_AMOUNT",
    source: text,
    tag: userState?.tag,
    category: userState?.category,
  }));
  console.log(userState);
  return replyMessage(accessToken, replyToken, "กรุณาใส่จำนวนเงิน");
}

async function processAmount(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  amount: string,
) {
  const clean = amount.replace(/[^\d.]/g, "");
  const cleanAmount = Number(clean);

  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    await replyMessage(accessToken, replyToken, "กรุณาใส่ตัวเลขที่ถูกต้อง");
  }
  const userState = await kv.get<UserState>(userId, "json")!;
  await insertExpend(
    userState?.tag!,
    userState?.source!,
    cleanAmount,
    userState?.category!,
  );
  await kv.delete(userId);
}

async function processSearchStation(
  kv: KVNamespace,
  accessToken: string,
  replyToken: string,
  userId: string,
  keyword: string,
) {
  const searchResult = await Train.processTrainStationSearch(keyword);
  if (searchResult.type === "SINGLE") {
    Train.confirmSetStation(kv, userId, searchResult.station);
  } else if (searchResult.type === "MULTIPLE") {
    await quickReplyMessages(
      accessToken,
      replyToken,
      "พบสถานีที่ตรงกับคำค้นหา กรุณาเลือกสถานีต้นทาง",
      Train.getQuickReplyStations(searchResult.stations),
    );
  } else {
    await replyMessage(
      accessToken,
      replyToken,
      "ไม่พบสถานีที่ค้นหา กรุณาลองใหม่อีกครั้ง",
    );
  }
}
