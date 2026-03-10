import {
  blueFare,
  pinkFare,
  purpleFare,
  transferDiscount,
  yellowFare,
} from "./farePolicy";
import { buildPath } from "./pathfinder";

export function calculateFare(origin: string, destination: string) {
  const pathes = buildPath(origin, destination);
  let fare = 0
  pathes.forEach((path) => {
    if(path.type === "segment") {
      if(path.line === "blue") fare += blueFare(path.stops);
      if(path.line === "pink") fare += pinkFare(path.stops);
      if(path.line === "yellow") fare += yellowFare(path.stops);
      if(path.line === "purple") fare += purpleFare(path.stops);
    } else {
      fare += transferDiscount(path.toLine); // transfer fee
    }
  })
  return {fare, pathes};
}
