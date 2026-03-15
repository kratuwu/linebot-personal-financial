import { quickReplyMessages, replyFlex, replyMessage } from "../lineApi";
import * as Train from "./train";
import tags from "./tags.json";
import { insertExpend, insertTransportation } from "./expende";
type UserState = {
  tag?: string;
  state: string;
  origin?: string;
  category?: string;
  source?: string;
};

export async function startTrainProcess(
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
  const sugestStationFlex = Train.processSuggestPath();
  return replyFlex(accessToken, replyToken, [sugestStationFlex]);
}

export async function startProcessManual(
  accessToken: string,
  replyToken: string,
  category: string,
) {
  await quickReplyMessages(
    accessToken,
    replyToken,
    "กรุณาเลือก tag",
    tags.map((tag) => ({
      type: "action",
      action: {
        type: "postback",
        label: tag,
        data: `action=start&process=general&tag=${tag}&category=${category}`,
      },
    })),
  );
}

export async function startGeneralProcess(
  kv: KVNamespace,
  accessToken: string,
  userId: any,
  replyToken: any,
  tag: any,
  category: string,
) {
  await kv.put(
    userId,
    JSON.stringify({
      state: "WAIT_SOURCE",
      category,
      tag,
    }),
  );
  await replyMessage(accessToken, replyToken, "กรุณาใส่รายละเอียด");
}

export async function processTrain(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  notionToken: string,
  expendeDatabaseId: string,
  params: URLSearchParams,
) {
  const process = params.get("process");
  if (process === "set_origin") {
    let userState = await kv.get<UserState>(userId, "json");
    await kv.put(
      userId,
      JSON.stringify({
        ...userState,
        origin: params.get("origin")!,
      }),
    );

    await replyMessage(
      accessToken,
      replyToken,
      `ต้นทาง: ${params.get("origin")} กรุณาใส่ปลายทาง`,
    );
  } else if (process === "set_destination") {
    const origin = params.get("origin")!;
    const dest = params.get("dest")!;
    await kv.delete(userId);
    await replyFlex(accessToken, replyToken, [Train.getConfirmationFlex(origin, dest)]);
  } else if (process === "confirm_fare") {
    const replyText = Train.getRouteText(
      params.get("origin")!,
      params.get("dest")!,
    );
    await processConfirmExpend(
      accessToken,
      replyToken,
      replyText + ` ค่าโดยสาร ${params.get("fare")} บาท`,
    );
    await insertTransportation(
      notionToken,
      expendeDatabaseId,
      replyText,
      parseInt(params.get("fare")!),
    );
  } else if (process === "cancel_fare") {
    await replyMessage(accessToken, replyToken, "ยกเลิกการบันทึกค่าเดินทาง");
    await kv.delete(userId);
  }
}

export async function processGeneral(
  accessToken: string,
  replyToken: string,
  notionToken: string,
  expendeDatabaseId: string,
  params: URLSearchParams,
) {
  const process = params.get("process");
  if (process === "confirm_fare") {
    const replyText = `${params.get("source")} ${params.get("tag")} ${params.get("category")}`;
    await processConfirmExpend(accessToken, replyToken, params.get("source")!);
    await insertExpend(
      notionToken,
      expendeDatabaseId,
      params.get("tag")!,
      replyText,
      parseInt(params.get("amount")!),
      params.get("category")!,
    );
  } else if (process === "cancel_fare") {
    await replyMessage(accessToken, replyToken, "ยกเลิกการบันทึกค่าเดินทาง");
  }
}

export async function processTextMessage(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = await kv.get<UserState>(userId, "json");
  if (userState?.state === "WAIT_SOURCE") {
    return processSetSource(kv, accessToken, userId, replyToken, text);
  }
  if (userState?.state === "WAIT_AMOUNT") {
    return processAmount(kv, accessToken, userId, replyToken, text);
  }
  if (
    userState?.state === "WAIT_STATION"
  ) {
    return processSearchStation(
      kv,
      accessToken,
      replyToken,
      userId,
      userState?.origin!,
      text,
    );
  }
}

async function processSetSource(
  kv: KVNamespace,
  accessToken: string,
  userId: string,
  replyToken: string,
  text: string,
) {
  const userState = await kv.get<UserState>(userId, "json")!;

  await kv.put(
    userId,
    JSON.stringify({
      state: "WAIT_AMOUNT",
      source: text,
      tag: userState?.tag,
      category: userState?.category,
    }),
  );
  replyMessage(accessToken, replyToken, "กรุณาใส่จำนวนเงิน");
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
  await confirmationExpend(accessToken, replyToken, userState, cleanAmount);
  await kv.delete(userId);
}

async function processSearchStation(
  kv: KVNamespace,
  accessToken: string,
  replyToken: string,
  userId: string,
  origin: string,
  keyword: string,
) {
  const searchResult = await Train.processTrainStationSearch(keyword);
  if (searchResult.type === "SINGLE") {
    const userState = await kv.get<UserState>(userId, "json");
    const { station } = searchResult;
    if (!origin) {
      await kv.put(
        userId,
        JSON.stringify({
          ...userState,
          origin: station.code,
        }),
      );
      await replyMessage(
        accessToken,
        replyToken,
        `ต้นทาง: ${station.name_th} กรุณาใส่ปลายทาง`,
      );
    } else {
      await kv.delete(userId);
      const flexMessage = Train.getConfirmationFlex(origin, station.code);
      await replyFlex(accessToken, replyToken, [flexMessage]);
    }
  } else if (searchResult.type === "MULTIPLE") {
    await quickReplyMessages(
      accessToken,
      replyToken,
      "พบสถานีที่ตรงกับคำค้นหา กรุณาเลือกสถานี",
      Train.getQuickReplyStations(searchResult.stations, origin),
    );
  } else {
    await replyMessage(
      accessToken,
      replyToken,
      "ไม่พบสถานีที่ค้นหา กรุณาลองใหม่อีกครั้ง",
    );
  }
}

async function processConfirmExpend(
  accessToken: string,
  replyToken: string,
  source: string,
) {
  return replyMessage(
    accessToken,
    replyToken,
    "บันทึกค่าใช้จ่ายเรียบร้อย" + "\n" + source,
  );
}

async function confirmationExpend(
  accessToken: string,
  replyToken: string,
  userState: UserState | null,
  cleanAmount: number,
) {
  await replyFlex(accessToken, replyToken, [
    {
      type: "flex",
      altText: "สรุปค่าใช้จ่าย",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "สรุปค่าใช้จ่าย",
              weight: "bold",
              size: "lg",
            },
            {
              type: "text",
              text: `${userState?.source}`,
              margin: "md",
            },
            {
              type: "text",
              text: `${cleanAmount} บาท`,
              weight: "bold",
              size: "xl",
              margin: "md",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "button",
              style: "primary",
              action: {
                type: "postback",
                label: "ยืนยัน",
                data: `action=general&process=confirm_fare&tag=${userState?.tag}&source=${userState?.source}&amount=${cleanAmount}&category=${userState?.category}`,
              },
            },
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "ยกเลิก",
                data: "action=general&process=cancel_fare",
              },
            },
          ],
        },
      },
    },
  ]);
}
