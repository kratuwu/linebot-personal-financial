import Fuse from "fuse.js";
import stations from "./stations.json";
import { Station } from "./model";


const stationFuse = new Fuse<Station>(stations, {
  keys: ["name_th", "name_en"],
  threshold: 0.3,
});

export async function searchStation(keyword: string) {
    if (!keyword) return [];

    return stationFuse
      .search(keyword)
      .slice(0, 5)
      .map((result) => result.item);
}
