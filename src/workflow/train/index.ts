import { calculateFare } from "./fare/fareEngine";
import sugestStation from "./sugestStations.json";
import { searchStation } from "./station/service";
import { Station } from "./station/model";

type TrainRouteState = {
  state: "WAIT_ORIGIN" | "WAIT_DESTINATION";
  origin: string;
  dest: string;
};

type StationSearchResult =
  | { type: "NOT_FOUND" }
  | { type: "SINGLE"; station: Station }
  | { type: "MULTIPLE"; stations: Station[] };

type ConfirmStationResult =
  | { type: "TEXT"; text: string }
  | { type: "FLEX"; flex: any }
  | undefined;

export async function processSuggestPath(kv: KVNamespace, userId: string) {
  await kv.put(userId, JSON.stringify({
    state: "WAIT_ORIGIN",
    origin: "",
    dest: "",
  }));
  return sugestStation;
}

export async function setTrainOrigin(kv: KVNamespace, userId: any, origin: string) {
  return kv.put(userId, JSON.stringify({
    state: "WAIT_DESTINATION",
    origin: origin,
    dest: "",
  }));
}

export async function processTrainStationSearch(keyword: string): Promise<StationSearchResult> {
  const stations = await searchStation(keyword);
  if (stations.length === 0) {
    return { type: "NOT_FOUND" };
  }
  if (stations.length === 1) {
    return { type: "SINGLE", station: stations[0] };
  } else {
    return { type: "MULTIPLE", stations };
  }
}

export async function confirmSetStation(
  kv: KVNamespace,
  userId: string,
  station: Station,
): Promise<ConfirmStationResult> {
  const trainRouteState = await kv.get<TrainRouteState>(userId, "json")!;
  if (trainRouteState?.state === "WAIT_ORIGIN") {
    await kv.put(userId, JSON.stringify({
      state: "WAIT_DESTINATION",
      origin: station.code,
      dest: "",
    }));
    return { type: "TEXT", text: `ต้นทาง: ${station.name_th} กรุณาใส่ปลายทาง` };
  }
  if (trainRouteState?.state === "WAIT_DESTINATION") {
    const origin = trainRouteState.origin;
    await kv.delete(userId);

    return { type: "FLEX", flex: getConfirmationFlex(origin, station.code) };
  }
}
export function getQuickReplyStations(stations: Station[]) {
  return stations.map((s: any) => ({
    type: "action",
    action: {
      type: "postback",
      label: s.name_th,
      data: `action=train&process=set_origin&origin=${s.code}`,
    },
  }));
}

export const getConfirmationFlex = (origin: string, dest: string) => {
  const fare = calculateFare(origin, dest);
  return {
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
  };
};
