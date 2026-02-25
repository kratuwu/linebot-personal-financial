//
// 🔁 1) Interchange alias

import {
  blueFare,
  pinkFare,
  purpleFare,
  yellowFare,
} from "./farePolicy";
import { shortestPath } from "./pathfinder";

//
const STATION_ALIAS: Record<string, string> = {
  BL10: "TAOPOON",
  PP16: "TAOPOON",
  BL15: "LARDPRAO",
  YL01: "LARDPRAO",
};

function normalize(code: string): string {
  return STATION_ALIAS[code] ?? code;
}

//
// 🚇 2) นับจำนวนสถานีจริง (ไม่ซ้ำ interchange)
//
export function countStations(path: string[]): number {
  let count = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (normalize(path[i]) !== normalize(path[i + 1])) {
      count++;
    }
  }
  return count;
}

function isBlue(code: string) {
  return code.startsWith("BL");
}

function isPurple(code: string) {
  return code.startsWith("PP");
}
function isPink(code: string) {
  return code.startsWith("PL");
}
function isOrange(code: string) {
  return code.startsWith("OL");
}
function isYellow(code: string) {
  return code.startsWith("YL");
}

function analyzePath(path: string[]) {
  let blue = 0;
  let purple = 0;
  let yellow = 0;
  let pink = 0;
  let transBlue = false
  let transPurple = false;
  let transYellow = false;
  let transPink = false;

  for (let i = 0; i < path.length -1; i++) {
    const current = path[i];
    const next = path[i + 1];
    if (normalize(current) === normalize(next)) {
      transBlue = transBlue || (isBlue(next) && (isYellow(current) ||isPurple(current)));
      transPurple = transPurple || (isPurple(next) && (isBlue(current) ||isPink(current)));
      transYellow = transYellow || (isYellow(next) && (isBlue(current) ||isOrange(current)));
      transPink = transPink || (isPink(next) && (isPurple(current)));
    } else {
      if (isBlue(path[i])) blue++;
      if (isPurple(path[i])) purple++;
      if (isYellow(path[i])) yellow++;
      if (isPink(path[i])) pink++;
    }
  }

  return ({
    blue: {distance: blue, transfered: transBlue}, 
    purple:{distance: purple, transfered: transPurple}, 
    yellow: {distance: yellow, transfered: transYellow},
    pink: {distance: pink, transfered: transPink}
  })
}

export function calculateFare(origin: string, destination: string) {
  const path = shortestPath(origin, destination);
  const { blue, yellow, purple, pink } = analyzePath(path);
  return (
    blueFare(blue) +
    purpleFare(purple) +
    yellowFare(yellow) +
    pinkFare(pink)
  );
}
