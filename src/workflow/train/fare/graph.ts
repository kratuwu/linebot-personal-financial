export const GRAPH: Record<string, string[]> = {};

function connect(a: string, b: string) {
  if (!GRAPH[a]) GRAPH[a] = [];
  if (!GRAPH[b]) GRAPH[b] = [];

  GRAPH[a].push(b);
  GRAPH[b].push(a);
}

function createNode(prefix: string, start: number, end: number) {
  for (let i = start; i <= end; i++) {
    const code = `${prefix}${String(i).padStart(2, "0")}`;
    GRAPH[code] = [];
  }
}

function createEdge(prefix: string, start: number, end: number, cyclic: boolean = false) {
  for (let i = start; i < end; i++) {
    connect(
      `${prefix}${String(i).padStart(2, "0")}`,
      `${prefix}${String(i + 1).padStart(2, "0")}`
    );
  }
  if (cyclic) {
    connect(
      `${prefix}${String(end).padStart(2, "0")}`,
      `${prefix}${String(start).padStart(2, "0")}`
    );
  }
}

/* =========================
   BLUE LINE BL01–BL32 
   Cyclic
========================= */
createNode("BL", 1, 32);
createEdge("BL", 1, 32, true);
/* =========================
   BLUE LINE BL33–BL38
========================= */
createNode("BL", 33, 38);
createEdge("BL", 33, 38);
/* =========================
   Connect BL01<–>BL33
========================= */
connect("BL01", "BL33");



/* =========================
   PURPLE LINE PP01–PP16
========================= */
createNode("PP", 1, 16);
createEdge("PP", 1, 16);
/* =========================
   Connect BL10<–>PP16
========================= */
connect("BL10", "PP16");

/* =========================
   YELLOW LINE YL01–YL23
========================= */
createNode("YL", 1, 23);
createEdge("YL", 1, 23);
/* =========================
   Connect YL10<–>BL16
========================= */
connect("YL01", "BL15");


/* =========================
   PINK LINE PK01–PK30
========================= */
createNode("MT", 1, 2);
createEdge("MT", 1, 2);

createNode("PK", 1, 30);
createEdge("PK", 1, 30);
/* =========================
   Connect PK10<–>MT01
========================= */
connect("PK10", "MT01");
/* =========================
   Connect PP11<–>PK01
========================= */
connect("PP11", "PK01");
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

function getLine(code: string) {
  if (isBlue(code)) return "blue";
  if (isPurple(code)) return "purple";
  if (isPink(code)) return "pink";
  if (isYellow(code)) return "yellow";
  if (isOrange(code)) return "orange";
  throw new Error("Unknown station code");
}
export {isBlue, isPurple, isPink, isYellow, isOrange, normalize, getLine};