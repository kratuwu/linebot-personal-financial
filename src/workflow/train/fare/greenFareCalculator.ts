import { extendedGreenFare, greenFare } from "./farePolicy";
import { isExtendedGreen } from "./graph";

export function calculateGreenFare(stations: string[]): number {
  if (stations.length <= 1) return greenFare(0);

  const totalStops = stations.length - 1;
  const extStart = stations.findIndex(isExtendedGreen);

  if (extStart < 0) return greenFare(totalStops);
  if (extStart === 0) return extendedGreenFare(totalStops);

  const baseStops = extStart - 1;
  const extStops = stations.length - extStart;

  return Math.min(greenFare(baseStops) + extendedGreenFare(extStops), 65);
}
