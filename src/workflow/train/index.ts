import { calculateFare } from "./fare/fareEngine";
import sugestStation from "./sugestStations.json";
import { quickReplyMessages, replyFlex, replyMessage } from "../../lineApi";
import { Station } from "./station/service";
import { StationModel } from "./station/model";

const trainRouteStates = new Map<
  string,
  {
    stage: string;
    origin: string;
    dest: string;
  }
>();

export function getSuggestPath() {
  return sugestStation;
}
export async function replySuggestPath(userId: string, replyToken: string) {
  trainRouteStates.set(userId, {
    stage: "WAIT_ORIGIN",
    origin: "",
    dest: "",
  });
  await quickReplyMessages(
    replyToken,
    "เลือกรูทที่ใช้บ่อย หรือพิมพ์ต้นทางเอง",
    sugestStation,
  );
}

export async function setTrainOrigin(
  userId: any,
  params: URLSearchParams,
  replyToken: any,
) {
  trainRouteStates.set(userId, {
    stage: "WAIT_DESTINATION",
    origin: params.get("origin")!,
    dest: "",
  });
  await replyMessage(
    replyToken,
    `ต้นทาง: ${params.get("origin")} กรุณาใส่ปลายทาง`,
  );
}

export async function processTrainStationSearch(
  userId: any,
  replyToken: any,
  keyword: string,
) {
  const trainRouteState = trainRouteStates.get(userId)!.stage;
  if (trainRouteState === "WAIT_ORIGIN") {
    return await processTrainStationSearchOrigin(userId, replyToken, keyword);
  }
  if (trainRouteState === "WAIT_DESTINATION") {
    return await processTrainStationSearchDestination(
      userId,
      replyToken,
      keyword,
    );
  }
}

async function processTrainStationSearchDestination(
  userId: any,
  replyToken: any,
  keyword: string,
) {
  const stations = await searchStation(keyword);
  if (stations.length === 0) {
    await replyMessage(replyToken, "ไม่พบสถานีที่ค้นหา กรุณาลองใหม่อีกครั้ง");
    return new Response("OK");
  }
  if (stations.length === 1) {
    const dest = stations[0];
    const trainRouteState = trainRouteStates.get(userId);
    await replyRouteConfirmation(
      userId,
      replyToken,
      trainRouteState?.origin!,
      dest.code,
    );
    return new Response("OK");
  } else {
    const trainRouteState = trainRouteStates.get(userId);
    await quickReplyMessages(
      replyToken,
      "พบสถานีที่ตรงกับคำค้นหา กรุณาเลือกสถานีต้นทาง",
      stations.map((s: any) => ({
        type: "action",
        action: {
          type: "postback",
          label: s.name_th,
          data: `action=train&process=set_route&origin=${trainRouteState?.origin}&dest=${s.code}`,
        },
      })),
    );
    return new Response("OK");
  }
}

async function processTrainStationSearchOrigin(
  userId: any,
  replyToken: any,
  keyword: string,
) {
  const stations = await searchStation(keyword);
  if (stations.length === 0) {
    await replyMessage(replyToken, "ไม่พบสถานีที่ค้นหา กรุณาลองใหม่อีกครั้ง");
    return new Response("OK");
  }
  if (stations.length === 1) {
    const origin = stations[0];
    trainRouteStates.set(userId, {
      stage: "WAIT_DESTINATION",
      origin: origin.code,
      dest: "",
    });
    await replyMessage(replyToken, `ต้นทาง: ${origin.name_th} กรุณาใส่ปลายทาง`);
    return new Response("OK");
  } else {
    await quickReplyMessages(
      replyToken,
      "พบสถานีที่ตรงกับคำค้นหา กรุณาเลือกสถานีต้นทาง",
      stations.map((s: any) => ({
        type: "action",
        action: {
          type: "postback",
          label: s.name_th,
          data: `action=train&process=set_origin&origin=${s.code}`,
        },
      })),
    );
    return new Response("OK");
  }
}

export async function replyRouteConfirmation(
  userId: string,
  replyToken: string,
  origin: string,
  dest: string,
) {
  const fare = calculateFare(origin, dest);
  return replyFlex(replyToken, [
    {
      type: "flex",
      altText: "สรุปค่าเดินทาง",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "🚆 ค่าเดินทาง",
              weight: "bold",
              size: "lg",
            },
            {
              type: "text",
              text: `${origin} → ${dest}`,
              margin: "md",
            },
            {
              type: "text",
              text: `${fare} บาท`,
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
                data:
                  "action=train&process=confirm_fare&origin=" +
                  origin +
                  "&dest=" +
                  dest +
                  "&fare=" +
                  fare,
              },
            },
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "ยกเลิก",
                data: "action=train&process=cancel_fare",
              },
            },
          ],
        },
      },
    },
  ]);
}

export async function replyConfirmFare(
  replyToken: string
) {
  return replyMessage(replyToken, "บันทึกค่าเดินทางเรียบร้อย");
}

export async function replyCancelFare(userId: string, replyToken: string) {
  trainRouteStates.delete(userId)
  return replyMessage(replyToken, "ยกเลิกการบันทึกค่าเดินทาง");
}

export async function searchStation(keyword: string): Promise<StationModel[]> {
  return Station.search(keyword);
}
