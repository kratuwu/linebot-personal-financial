export { calculateGreenFare } from "./greenFareCalculator";
import { buildPath } from "./pathfinder";

export function calculateFare(origin: string, destination: string) {
  const { pathes, cost } = buildPath(origin, destination);
  return { fare: cost, pathes };
}
