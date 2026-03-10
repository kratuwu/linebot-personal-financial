import { calculateFare } from "./fare/fareEngine";
import sugestStation from "./sugestStations.json";
import { searchByCode, searchStation } from "./station/service";
import { Station } from "./station/model";

type StationSearchResult =
  | { type: "NOT_FOUND" }
  | { type: "SINGLE"; station: Station }
  | { type: "MULTIPLE"; stations: Station[] };

export function processSuggestPath() {
  return {
    type: "flex",
    altText: "routes",
    contents: {
      type: "carousel",
      contents: sugestStation.map((route) => {
        const paths = calculateFare(route.origin, route.dest);
        const originName = searchByCode(route.origin).name_th;
        const destName = searchByCode(route.dest).name_th;
        return {
          type: "bubble",
          size: "mega",
          header: {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "FROM",
                    color: "#ffffff66",
                    size: "sm",
                  },
                  {
                    type: "text",
                    text: originName,
                    color: "#ffffff",
                    size: "xl",
                    flex: 4,
                    weight: "bold",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "TO",
                    color: "#ffffff66",
                    size: "sm",
                  },
                  {
                    type: "text",
                    text: destName,
                    color: "#ffffff",
                    size: "xl",
                    flex: 4,
                    weight: "bold",
                  },
                ],
              },
            ],
            paddingAll: "20px",
            backgroundColor: "#0367D3",
            spacing: "md",
            height: "100px",
            paddingTop: "22px",
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "Fare",
                color: "#000000",
                size: "md",
                weight: "bold",
              },
              ...buildFlex(originName, destName, paths.pathes),
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "เลือก",
                  data: `action=train&process=confirm_fare&origin=${route.origin}&dest=${route.dest}&fare=${paths.fare}`,
                },
              },
            ],
          },
        };
      }),
    },
  };
}

export async function processTrainStationSearch(
  keyword: string,
): Promise<StationSearchResult> {
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

export function getQuickReplyStations(stations: Station[], origin: string) {
  const process = origin ? "set_destination" : "set_origin";
  const getOrigin = (code: string) => (origin ? origin : code);
  const getDest = (code: string) => (origin ? code : null);
  console.log(stations)
  return stations.map((s: Station) => ({
    type: "action",
    action: {
      type: "postback",
      label: s.name_th,
      data: `action=train&process=${process}&origin=${getOrigin(s.code)}&dest=${getDest(s.code)}`,
    },
  }));
}

export const getConfirmationFlex = (origin: string, dest: string) => {
  const { fare } = calculateFare(origin, dest);
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
            text: `${searchByCode(origin).name_th} → ${searchByCode(dest).name_th}`,
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
export function getRouteText(origin: string, dest: string): string {
  return `${searchByCode(origin).name_th} → ${searchByCode(dest).name_th}`;
}

function buildFlex(origin: string, dest: string, paths: any[]) {
  
  return[statioinBullet(origin),buildLine("#6486E3"), ...paths.flatMap((path) =>
    path.type === "change"
      ? [statioinBullet(searchByCode( path.from).name_th), buildLine("#6486E3")]
      : [],
  ), statioinBullet(dest)]
}

function statioinBullet(stationName: string) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "filler",
          },
          {
            type: "box",
            layout: "vertical",
            contents: [],
            cornerRadius: "30px",
            width: "12px",
            height: "12px",
            borderWidth: "2px",
            borderColor: "#6486E3",
          },
          {
            type: "filler",
          },
        ],
        flex: 0,
      },
      {
        type: "text",
        text: stationName,
        gravity: "center",
        flex: 4,
        size: "sm",
      },
    ],
    spacing: "lg",
    cornerRadius: "30px",
  };
}

function buildLine(color: string) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "filler",
              },
              {
                type: "box",
                layout: "vertical",
                contents: [],
                width: "2px",
                backgroundColor: color,
              },
              {
                type: "filler",
              },
            ],
            flex: 1,
          },
        ],
        width: "12px",
      },
    ],
    spacing: "lg",
    height: "64px",
    flex: 4,
  };
}
