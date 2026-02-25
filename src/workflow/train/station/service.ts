import Fuse from "fuse.js";
import stations from "./stations.json";
import { StationModel } from "./model";


const stationFuse = new Fuse<StationModel.station>(stations, {
  keys: ["name_th", "name_en"],
  threshold: 0.3,
});

export abstract class Station {
  static async search(keyword: StationModel.keyword) {
    if (!keyword) return [];

    return stationFuse
      .search(keyword)
      .slice(0, 5)
      .map((result) => result.item);
  }
}
