import Fuse from "fuse.js";
import stations from "./stations.json";
import { Station } from "./model";


const stationFuse = new Fuse<Station>(stations as Station[], {
  keys: ["name_th", "name_en"],
  threshold: 0.3,
});

export function searchByCode(code: string): Station {
  return stations.find((s) => s.code === code) as Station;
}
export async function searchStation(keyword: string) {
    if (!keyword) return [];

    return stationFuse
      .search(keyword)
      .slice(0, 5)
      .map((result) => result.item);
}
