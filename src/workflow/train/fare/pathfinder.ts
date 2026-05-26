import { getLine, GRAPH } from "./graph";
import {
  blueFare,
  pinkFare,
  purpleFare,
  yellowFare,
  transferDiscount,
} from "./farePolicy";
import { calculateGreenFare } from "./greenFareCalculator";

function getLineFareByStops(line: string, stops: number): number {
  if (line === "blue") return blueFare(stops);
  if (line === "pink") return pinkFare(stops);
  if (line === "purple") return purpleFare(stops);
  if (line === "yellow") return yellowFare(stops);
  return 0;
}

function getLineFare(line: string, stations: string[]): number {
  if (line === "green") return calculateGreenFare(stations);
  return getLineFareByStops(line, stations.length - 1);
}

function getFarePolicyLineCode(line: string): string {
  if (line === "blue") return "BL";
  if (line === "purple") return "PP";
  if (line === "yellow") return "YL";
  if (line === "pink") return "PU";
  if (line === "orange") return "OL";
  return line;
}

function getTransferDiscount(line: string): number {
  return transferDiscount(getFarePolicyLineCode(line));
}

interface RouteState {
  station: string;
  line: string;
  stationsOnLine: string[];
  completedCost: number;
  totalCost: number;
  path: string[];
}

interface PathSearchResult {
  stations: string[];
  cost: number;
}

type PathSegment = {
  type: "segment";
  line: string;
  from: string;
  to: string;
  stops: number;
  stations: string[];
};

type PathChange = {
  type: "change";
  from: string;
  to: string;
  toLine: string;
};

export type BuiltPathStep = PathSegment | PathChange;

export type BuiltPathResult = {
  pathes: BuiltPathStep[];
  cost: number;
};

function cheapestPath(start: string, end: string): PathSearchResult {
  const startLine = getLine(start);

  if (start === end) {
    return {
      stations: [start],
      cost: getLineFare(startLine, [start]),
    };
  }

  const queue: RouteState[] = [
    {
      station: start,
      line: startLine,
      stationsOnLine: [start],
      completedCost: 0,
      totalCost: getLineFare(startLine, [start]),
      path: [start],
    },
  ];

  const visited = new Map<string, number>();

  while (queue.length > 0) {
    queue.sort((a, b) => a.totalCost - b.totalCost);
    const state = queue.shift()!;

    const stateKey = `${state.station}:${state.line}`;
    if (visited.has(stateKey) && visited.get(stateKey)! <= state.totalCost) {
      continue;
    }
    visited.set(stateKey, state.totalCost);

    if (state.station === end) {
      return {
        stations: state.path,
        cost: state.totalCost,
      };
    }

    for (const neighbor of GRAPH[state.station] || []) {
      const neighborLine = getLine(neighbor);
      let completedCost = state.completedCost;
      let stationsOnLine = state.stationsOnLine;
      let totalCost = state.totalCost;

      if (neighborLine === state.line) {
        stationsOnLine = [...state.stationsOnLine, neighbor];
        totalCost = completedCost + getLineFare(state.line, stationsOnLine);
      } else {
        completedCost =
          state.completedCost +
          getLineFare(state.line, state.stationsOnLine) +
          getTransferDiscount(neighborLine);
        stationsOnLine = [neighbor];
        totalCost = completedCost + getLineFare(neighborLine, stationsOnLine);
      }

      const neighborStateKey = `${neighbor}:${neighborLine}`;
      if (
        !visited.has(neighborStateKey) ||
        totalCost < visited.get(neighborStateKey)!
      ) {
        queue.push({
          station: neighbor,
          line: neighborLine,
          stationsOnLine,
          completedCost,
          totalCost,
          path: [...state.path, neighbor],
        });
      }
    }
  }

  throw new Error("Path not found");
}

export function buildPath(origin: string, dest: string): BuiltPathResult {
  const { stations: pathes, cost } = cheapestPath(origin, dest);
  const result: BuiltPathStep[] = [];

  let start = pathes[0];
  let line = getLine(start);
  let stops = 0;
  let stations: string[] = [pathes[0]];
  for (let i = 1; i < pathes.length; i++) {
    const station = pathes[i];
    const stationLine = getLine(station);

    if (stationLine === line) {
      stops++;
      stations.push(station);
    } else {
      result.push({
        type: "segment",
        line,
        from: start,
        to: pathes[i - 1],
        stops,
        stations: [...stations],
      });

      result.push({
        type: "change",
        from: pathes[i - 1],
        to: station,
        toLine: stationLine,
      });
      start = station;
      line = stationLine;
      stops = 0;
      stations = [station];
    }
  }

  result.push({
    type: "segment",
    line,
    from: start,
    to: pathes[pathes.length - 1],
    stops,
    stations: [...stations],
  });

  return {
    pathes: result,
    cost,
  };
}
