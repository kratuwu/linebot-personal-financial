import { GRAPH } from "./graph";
export function shortestPath(start: string, end: string): string[] {
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