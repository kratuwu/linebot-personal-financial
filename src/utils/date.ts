const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export function parseDateFromText(text: string) {
  const numericDate = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (numericDate) {
    return toIsoDate(
      normalizeYear(numericDate[3]),
      Number(numericDate[2]),
      Number(numericDate[1]),
    );
  }

  const monthDate = text.match(
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{2,4})\b/i,
  );
  if (monthDate) {
    return toIsoDate(
      normalizeYear(monthDate[3]),
      monthToNumber(monthDate[2]),
      Number(monthDate[1]),
    );
  }

  return null;
}

export function toBangkokDate(value?: string | Date) {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${value}T00:00:00+07:00`);
}

export function toBangkokDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function toBangkokMonthName(date: Date) {
  return date.toLocaleString("en-US", {
    month: "long",
    timeZone: BANGKOK_TIME_ZONE,
  });
}

function normalizeYear(year: string) {
  const parsedYear = Number(year);
  if (parsedYear < 100) {
    return 2000 + parsedYear;
  }

  return parsedYear;
}

function monthToNumber(month: string) {
  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  return monthNames.indexOf(month.slice(0, 3).toLowerCase()) + 1;
}

function toIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");
}
