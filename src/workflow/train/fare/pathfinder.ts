import {
  getLine,
  GRAPH,
} from "./graph";
function shortestPath(start: string, end: string): string[] {
  if (start === end) return [start];

  const queue: string[][] = [[start]];
  const visited = new Set([start]);

  while (queue.length) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    for (const neighbor of GRAPH[node] || []) {
      if (visited.has(neighbor)) continue;
      const newPath = [...path, neighbor];
      if (neighbor === end) {
        return newPath;
      }
      visited.add(neighbor);
      queue.push(newPath);
    }
  }

  throw new Error("Path not found");
}

export function buildPath(origin: string, dest: string) {
  const pathes = shortestPath(origin,dest)
  const result: any[] = []

  let start = pathes[0]
  let line = getLine(start)
  let stops = 0

  for (let i = 1; i < pathes.length; i++) {
    const station = pathes[i]
    const stationLine = getLine(station)

    if (stationLine === line) {
      stops++
    } else {
      result.push({
        type: "segment",
        line,
        from: start,
        to: pathes[i - 1],
        stops
      })

      result.push({
        type: "change",
        from: pathes[i - 1],
        to: station,
        toLine: stationLine
      })

      start = station
      line = stationLine
      stops = 0
    }
  }

  result.push({
    type: "segment",
    line,
    from: start,
    to: pathes[pathes.length - 1],
    stops
  })

  return result

}