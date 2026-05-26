export const GRAPH: Record<string, string[]> = {};

type LineName = "blue" | "green" | "orange" | "pink" | "purple" | "yellow";

type StationRange = {
  prefix: string;
  start: number;
  end: number;
  padCode?: boolean;
  cyclic?: boolean;
};

const STATION_ALIAS: Record<string, string> = {
  BL10: "TAOPOON",
  PP16: "TAOPOON",
  BL15: "LARDPRAO",
  YL01: "LARDPRAO",
  BL22: "ASOK",
  E4: "ASOK",
  BL26: "SALDAENG",
  S2: "SALDAENG",
  E15: "SAMRONG",
  YL23: "SAMRONG",
};

function stationCode(prefix: string, index: number, padCode = true): string {
  const codeNumber = padCode ? String(index).padStart(2, "0") : String(index);
  return `${prefix}${codeNumber}`;
}

function ensureStation(code: string): void {
  GRAPH[code] ??= [];
}

function connect(a: string, b: string): void {
  ensureStation(a);
  ensureStation(b);

  if (!GRAPH[a].includes(b)) GRAPH[a].push(b);
  if (!GRAPH[b].includes(a)) GRAPH[b].push(a);
}

function createStations({ prefix, start, end, padCode = true }: StationRange): void {
  for (let i = start; i <= end; i++) {
    ensureStation(stationCode(prefix, i, padCode));
  }
}

function connectStations({
  prefix,
  start,
  end,
  padCode = true,
  cyclic = false,
}: StationRange): void {
  for (let i = start; i < end; i++) {
    connect(
      stationCode(prefix, i, padCode),
      stationCode(prefix, i + 1, padCode)
    );
  }

  if (cyclic) {
    connect(
      stationCode(prefix, end, padCode),
      stationCode(prefix, start, padCode)
    );
  }
}

function createLine(range: StationRange): void {
  createStations(range);
  connectStations(range);
}

/* =========================
   BLUE LINE BL01–BL32 
   Cyclic
========================= */
createLine({ prefix: "BL", start: 1, end: 32, cyclic: true });
/* =========================
   BLUE LINE BL33–BL38
========================= */
createLine({ prefix: "BL", start: 33, end: 38 });
/* =========================
   Connect BL01<–>BL33
========================= */
connect("BL01", "BL33");

/* =========================
   PURPLE LINE PP01–PP16
========================= */
createLine({ prefix: "PP", start: 1, end: 16 });
/* =========================
   Connect BL10<–>PP16
========================= */
connect("BL10", "PP16");

/* =========================
   YELLOW LINE YL01–YL23
========================= */
createLine({ prefix: "YL", start: 1, end: 23 });
/* =========================
   Connect YL01<–>BL15
========================= */
connect("YL01", "BL15");

/* =========================
   PINK LINE PK01–PK30
========================= */
createLine({ prefix: "MT", start: 1, end: 2 });

createLine({ prefix: "PK", start: 1, end: 30 });
/* =========================
   Connect PK10<–>MT01
========================= */
connect("PK10", "MT01");
/* =========================
   Connect PP11<–>PK01
========================= */
connect("PP11", "PK01");

/* =========================
   BTS SUKHUMVIT North LINE BS01–BS23
========================= */
createLine({ prefix: "N", start: 1, end: 5, padCode: false });
createLine({ prefix: "N", start: 7, end: 24, padCode: false });
connect("N5", "N7");
ensureStation("CEN");
connect("N1", "CEN");

createLine({ prefix: "E", start: 1, end: 23, padCode: false });
connect("CEN", "E1");

ensureStation("W1");
createLine({ prefix: "S", start: 1, end: 12, padCode: false });
connect("W1", "CEN");
connect("CEN", "S1");

connect("E4", "BL22");
connect("S2", "BL26");
connect("E15", "YL23");

function normalize(code: string): string {
  return STATION_ALIAS[code] ?? code;
}

function isBlue(code: string): boolean {
  return code.startsWith("BL");
}

function isPurple(code: string): boolean {
  return code.startsWith("PP");
}

function isPink(code: string): boolean {
  return code.startsWith("PK") || code.startsWith("MT");
}

function isOrange(code: string): boolean {
  return code.startsWith("OL");
}

function isYellow(code: string): boolean {
  return code.startsWith("YL");
}

function isGreen(code: string): boolean {
  return (
    code === "CEN" ||
    code === "W1" ||
    code.startsWith("N") ||
    code.startsWith("E") ||
    code.startsWith("S")
  );
}

export function getLine(code: string): LineName {
  if (isBlue(code)) return "blue";
  if (isPurple(code)) return "purple";
  if (isPink(code)) return "pink";
  if (isYellow(code)) return "yellow";
  if (isOrange(code)) return "orange";
  if (isGreen(code)) return "green";
  throw new Error("Unknown station code");
}

export function isExtendedGreen(code: string): boolean {
  if (code === "CEN" || code === "W1") return false;

  const stationNumber = Number.parseInt(code.slice(1), 10);
  if (Number.isNaN(stationNumber)) return false;

  if (code.startsWith("N") || code.startsWith("S")) return stationNumber >= 9;
  if (code.startsWith("E")) return stationNumber >= 10;
  return false;
}

export { isBlue, isPurple, isPink, isYellow, isOrange, isGreen, normalize };
