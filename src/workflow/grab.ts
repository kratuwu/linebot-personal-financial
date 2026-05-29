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

export function buildGrabExpense(input: StructuredGrabExpense): GrabExpense | null {
  const service = normalizeGrabService(input.service);
  if (!service || !input.amount || input.amount <= 0) {
    return null;
  }

  return {
    source: buildSource(service, input.source),
    amount: input.amount,
    tag: getTag(service),
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

function getTag(service: string) {
  if (service === "GrabFood") return "Dining Out";
  if (service === "GrabMart") return "Dining Out";
  return "Transportation";
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
