import { parseDateFromText } from "../utils/date";

type GrabExpense = {
  source: string;
  amount: number;
  tag: string;
  category: string;
  referenceId?: string;
  date?: string;
};

type GrabExpenseOverrides = {
  amount?: number;
  referenceId?: string;
  date?: string;
};

const GRAB_KEYWORDS = [
  "grab",
  "grabfood",
  "grabmart",
  "grabcar",
  "grabbike",
  "grabtaxi",
  "grabexpress",
];

const AMOUNT_LABELS = [
  "total paid",
  "total",
  "amount paid",
  "paid",
  "fare",
  "ยอดรวม",
  "ยอดชำระ",
  "ชำระแล้ว",
  "ค่าโดยสาร",
  "รวม",
];

export function parseGrabExpense(
  text: string,
  overrides: GrabExpenseOverrides = {},
): GrabExpense | null {
  if (!looksLikeGrab(text)) {
    return null;
  }

  const amount = overrides.amount ?? parseAmount(text);
  if (!amount) {
    return null;
  }

  const service = getGrabService(text);
  return {
    source: buildSource(text, service),
    amount,
    tag: getTag(service),
    category: "Consumable",
    referenceId: overrides.referenceId ?? parseReferenceId(text),
    date: overrides.date ?? parseReceiptDate(text),
  };
}

function looksLikeGrab(text: string) {
  const lowerText = text.toLowerCase();
  return GRAB_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

function parseAmount(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (AMOUNT_LABELS.some((label) => line.toLowerCase().includes(label))) {
      const amount = parseFirstAmount(line);
      if (amount) {
        return amount;
      }

      const nextLineAmount = parseFirstAmount(lines[index + 1] ?? "");
      if (nextLineAmount) {
        return nextLineAmount;
      }
    }
  }

  return parseLargestAmount(text);
}

function parseFirstAmount(text: string) {
  const match = text.match(/(?:฿|THB|บาท)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!match) {
    return null;
  }

  return toAmount(match[1]);
}

function parseLargestAmount(text: string) {
  const currencyMatches = [
    ...text.matchAll(/(?:฿|THB)\s*([0-9][0-9,]*(?:\.\d{1,2})?)|([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:บาท)/gi),
  ];
  const currencyAmounts = currencyMatches
    .map((match) => toAmount(match[1] ?? match[2]))
    .filter((amount): amount is number => amount !== null);

  if (currencyAmounts.length > 0) {
    return Math.max(...currencyAmounts);
  }

  const matches = [...text.matchAll(/(?:฿|THB|บาท)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi)];
  const amounts = matches
    .map((match) => toAmount(match[1]))
    .filter((amount) => amount === null || amount < 1900 || amount > 2100)
    .filter((amount): amount is number => amount !== null);

  if (amounts.length === 0) {
    return null;
  }

  return Math.max(...amounts);
}

function toAmount(value: string) {
  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function getGrabService(text: string) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("grabfood")) return "GrabFood";
  if (lowerText.includes("grabmart")) return "GrabMart";
  if (lowerText.includes("grabexpress")) return "GrabExpress";
  if (lowerText.includes("grabbike")) return "GrabBike";
  if (lowerText.includes("grabtaxi")) return "GrabTaxi";
  if (lowerText.includes("grabcar")) return "GrabCar";
  return "Grab";
}

function getTag(service: string) {
  if (service === "GrabFood") return "Dining Out";
  if (service === "GrabMart") return "Dining Out";
  return "Transportation";
}

function buildSource(text: string, service: string) {
  const origin = parseOrigin(text);
  const destination = parseDestination(text);

  if (origin && destination && isTransportationService(service)) {
    return `${service} - ${origin} to ${destination}`;
  }

  if (origin) {
    return `${service} - ${origin}`;
  }

  return service;
}

function parseOrigin(text: string) {
  return parseLabeledValue(text, [
    "origin",
    "pickup",
    "pick-up",
    "picked up from",
    "merchant",
    "restaurant",
    "store",
    "order from",
    "from",
    "ต้นทาง",
    "จุดรับ",
    "สถานที่เริ่มต้นการเดินทาง",
    "ร้าน",
    "จาก",
  ]);
}

function parseDestination(text: string) {
  return parseLabeledValue(text, [
    "destination",
    "drop off",
    "drop-off",
    "dropped off at",
    "to",
    "ปลายทาง",
    "จุดส่ง",
    "ถึง",
  ]);
}

function parseLabeledValue(text: string, labels: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const inlineValue = parseInlineLabeledValue(lines[index], labels);
    const value = inlineValue ?? parseNextLineLabeledValue(lines, index, labels);
    if (value && isValidSourceValue(value)) {
      return value.slice(0, 80);
    }
  }

  return null;
}

function parseInlineLabeledValue(line: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`^${escapeRegExp(label)}\\s*:?\\s*(.+)$`, "i");
    const match = line.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function parseNextLineLabeledValue(
  lines: string[],
  index: number,
  labels: string[],
) {
  const line = lines[index];
  if (!labels.some((label) => line.toLowerCase() === label.toLowerCase())) {
    return null;
  }

  return lines[index + 1]?.trim() || null;
}

function isValidSourceValue(value: string) {
  if (/^(?:฿|THB)?\s*[0-9][0-9,]*(?:\.\d{1,2})?\s*(?:บาท)?$/i.test(value)) {
    return false;
  }

  if (value.includes("@") || /<[^>]+>/.test(value)) {
    return false;
  }

  return !/^grab\b/i.test(value);
}

function isTransportationService(service: string) {
  return !["GrabFood", "GrabMart"].includes(service);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseReferenceId(text: string) {
  const referencePatterns = [
    /(?:booking code|booking id|order id|order number|receipt number|transaction id)\s*:?\s*([A-Z0-9-]+)/i,
    /(?:รหัสการจอง|เลขที่คำสั่งซื้อ|หมายเลขคำสั่งซื้อ|เลขที่ใบเสร็จ)\s*:?\s*([A-Z0-9-]+)/i,
  ];

  for (const pattern of referencePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function parseReceiptDate(text: string) {
  const labeledDate = parseLabeledDate(text);
  if (labeledDate) {
    return labeledDate;
  }

  return parseAnyDate(text) ?? undefined;
}

function parseLabeledDate(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const labels = [
    "date",
    "order date",
    "booking date",
    "receipt date",
    "วันที่",
    "วันที่สั่งซื้อ",
    "วันที่ใช้บริการ",
  ];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!labels.some((label) => line.toLowerCase().includes(label))) {
      continue;
    }

    const date = parseDateFromText(line) ?? parseDateFromText(lines[index + 1] ?? "");
    if (date) {
      return date;
    }
  }

  return null;
}

function parseAnyDate(text: string) {
  return parseDateFromText(text);
}
