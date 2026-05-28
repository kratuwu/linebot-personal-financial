type GrabExpense = {
  source: string;
  amount: number;
  tag: string;
  category: string;
  referenceId?: string;
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

export function parseGrabExpense(text: string): GrabExpense | null {
  if (!looksLikeGrab(text)) {
    return null;
  }

  const amount = parseAmount(text);
  if (!amount) {
    return null;
  }

  const service = getGrabService(text);
  return {
    source: buildSource(text, service),
    amount,
    tag: getTag(service),
    category: "Consumable",
    referenceId: parseReferenceId(text),
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
  const merchant = parseMerchant(text);
  if (merchant) {
    return `${service} - ${merchant}`;
  }

  return service;
}

function parseMerchant(text: string) {
  const merchantPatterns = [
    /(?:merchant|restaurant|store|ร้าน)\s*:?\s*(.+)/i,
    /(?:from|จาก)\s*:?\s*(.+)/i,
  ];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    const merchant = match?.[1]?.trim();
    if (merchant && !parseFirstAmount(merchant)) {
      return merchant.slice(0, 80);
    }
  }

  return null;
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
