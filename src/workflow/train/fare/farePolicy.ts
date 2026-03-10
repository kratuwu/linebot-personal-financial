export function blueFare(distance: number): number {
  if (distance === 0) return 16;
  if (distance === 1) return 17;
  if (distance === 2) return 20;
  if (distance === 3) return 22;
  if (distance === 4) return 25;
  if (distance === 5) return 27;
  if (distance === 6) return 30;
  if (distance === 7) return 32;
  if (distance === 8) return 35;
  if (distance === 9) return 37;
  if (distance === 10) return 40;
  if (distance === 11) return 42;
  else return 45;
}
export function purpleFare(distance: number): number {
  if (distance === 0) return 14;
  if (distance === 1) return 17;
  if (distance === 2) return 20;
  if (distance === 3) return 23;
  if (distance === 4) return 25;
  if (distance === 5) return 27;
  if (distance === 6) return 30;
  if (distance === 7) return 33;
  if (distance === 8) return 36;
  if (distance === 9) return 38;
  if (distance === 10)return 40;
  else return 42;
}

export function yellowFare(distance: number): number {
  if (distance === 0) return 15;
  if (distance === 1) return 19;
  if (distance === 2) return 23;
  if (distance === 3) return 27;
  if (distance === 4) return 30;
  if (distance === 5) return 33;
  if (distance === 6) return 36;
  if (distance === 7) return 39;
  if (distance === 8) return 42;
  else return 45;
}
export function pinkFare(distance: number): number {
  if (distance === 0) return 15;
  if (distance === 1) return 18;
  if (distance === 2) return 23;
  if (distance === 3) return 28;
  if (distance === 4) return 30;
  if (distance === 5) return 34;
  if (distance === 6) return 37;
  if (distance === 7) return 41;
  if (distance === 8) return 44;
  else return 45;
}
export function transferDiscount(toLine: string): number {
 if (toLine === "BL") return -14;
 if (toLine === "PP") return -14;
 if (toLine === "YL") return -15;
 if (toLine === "PU") return -15;
 return 0;
}