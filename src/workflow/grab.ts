type GrabExpense = {
  source: string;
  amount: number;
  tag: string;
  category: string;
  referenceId?: string;
  date?: string;
};

type StructuredGrabExpense = {
  service?: string;
  source?: string;
  amount?: number;
  referenceId?: string;
  date?: string;
};

const GRAB_SERVICES = [
  "GrabFood",
  "GrabMart",
  "GrabExpress",
  "GrabBike",
  "GrabTaxi",
  "GrabCar",
  "Grab",
];

const COFFEE_KEYWORDS = [
  "coffee",
  "cafe",
  "café",
  "กาแฟ",
  "starbucks",
  "amazon",
];

export function buildGrabExpense(input: StructuredGrabExpense): GrabExpense | null {
  const service = normalizeGrabService(input.service);
  if (!service || !input.amount || input.amount <= 0) {
    return null;
  }

  return {
    source: buildSource(service, input.source),
    amount: input.amount,
    tag: getTag(service, input.source),
    category: "Consumable",
    referenceId: input.referenceId,
    date: input.date,
  };
}

function normalizeGrabService(service?: string) {
  if (!service) {
    return null;
  }

  const lowerService = service.toLowerCase();
  return GRAB_SERVICES.find(
    (grabService) => grabService.toLowerCase() === lowerService,
  ) ?? null;
}

function getTag(service: string, source?: string) {
  if (isCoffeeSource(source)) return "Coffee";
  if (service === "GrabFood") return "Dining Out";
  if (service === "GrabMart") return "Dining Out";
  return "Transportation";
}

function isCoffeeSource(source?: string) {
  const lowerSource = source?.toLowerCase() ?? "";
  return COFFEE_KEYWORDS.some((keyword) => lowerSource.includes(keyword));
}

function buildSource(service: string, source?: string) {
  const cleanSource = source?.trim();
  if (!cleanSource) {
    return service;
  }

  if (cleanSource.toLowerCase().startsWith(service.toLowerCase())) {
    return cleanSource;
  }

  return `${service} - ${cleanSource}`;
}
