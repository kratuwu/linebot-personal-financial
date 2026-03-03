import { quickReplyMessages, replyFlex, replyMessage } from "../lineApi";
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

export async function startProcessTrain(
  accessToken: string,
  userId: any,
  replyToken: any,
) {
  userStates.set(userId, {
    stage: "WAIT_STATION",
    tag: "transportation",
  });
  const sugestStation = Train.processSuggestPath(userId);
  console.log(sugestStation)
  await quickReplyMessages(
    accessToken,
    replyToken,
    "เลือกรูทที่ใช้บ่อย หรือพิมพ์ต้นทางเอง",
    sugestStation,
  );
}

export async function processTrain(
  accessToken: string,
  userId: string,
  replyToken: string,
  params: URLSearchParams,
) {
  const process = params.get("process");
  console.log(process)
  if (process === "set_route") {
    const flexMessage = Train.getConfirmationFlex(
      params.get("origin")!,
      params.get("dest")!,
    );
    await replyFlex(accessToken, replyToken, [flexMessage]);
    userStates.delete(userId);
  } else if (process === "set_origin") {
    Train.setTrainOrigin(userId, params.get("origin")!);
    await replyMessage(
      accessToken,
      replyToken,
      `ต้นทาง: ${params.get("origin")} กรุณาใส่ปลายทาง`,
    );
  } else if (process === "confirm_fare") {
    const replyText = `${params.get("origin")} -> ${params.get("dest")}`;
    await replyMessage(accessToken, replyToken, "บันทึกค่าเดินทางเรียบร้อย");
    await insertTransportation(replyText, parseInt(params.get("fare")!));
    userStates.delete(userId);
  } else if (process === "cancel_fare") {
    await replyMessage(accessToken, replyToken, "ยกเลิกการบันทึกค่าเดินทาง");
    userStates.delete(userId);
  }
}

export async function startProcessManual(
  accessToken: string,
  userId: string,
  replyToken: string,
  category: string,
) {
  userStates.set(userId, {
    stage: "WAIT_TAG",
    category,
  });
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
  accessToken: string,
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = userStates.get(userId);
  if (userState?.stage === "WAIT_TAG") {
    return await processSetTag(accessToken, userId, replyToken, text);
  }
  if (userState?.stage === "WAIT_SOURCE") {
    return await processSetSource(accessToken, userId, replyToken, text);
  }
  if (userState?.stage === "WAIT_AMOUNT") {
    return await processAmount(accessToken, userId, replyToken, text);
  }
  if (userState?.stage === "WAIT_STATION") {
    return await processSearchStation(accessToken, replyToken, userId, text);
  }
}

export async function startGeneralProcess(
  accessToken: string,
  userId: any,
  replyToken: any,
  tag: any,
) {
  userStates.set(userId, { stage: "WAIT_SOURCE" });
  await processSetTag(accessToken, userId, replyToken, tag);
  console.log(userStates)
}

export async function processSetTag(
  accessToken: string,
  userId: any,
  replyToken: any,
  tag: any,
) {
  const userState = userStates.get(userId)!;
  userStates.set(userId, {
    stage: "WAIT_SOURCE",
    category: userState.category,
    tag: tag,
  });
  await replyMessage(accessToken, replyToken, "กรุณาใส่รายละเอียด");
}

async function processSetSource(
  accessToken: string,
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = userStates.get(userId)!;

  userStates.set(userId, {
    stage: "WAIT_AMOUNT",
    source: text,
    category: userState.category,
  });
  console.log(userState)
  return replyMessage(accessToken, replyToken, "กรุณาใส่จำนวนเงิน");
}

async function processAmount(
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
  const userState = userStates.get(userId)!;
  await insertExpend(
    userState.tag!,
    userState.source!,
    cleanAmount,
    userState.category!,
  );
  userStates.delete(userId);
}

async function processSearchStation(
  accessToken: string,
  replyToken: string,
  userId: string,
  keyword: string,
) {
  const searchResult = await Train.processTrainStationSearch(keyword);
  if (searchResult.type === "SINGLE") {
    Train.confirmSetStation(userId, searchResult.station);
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
