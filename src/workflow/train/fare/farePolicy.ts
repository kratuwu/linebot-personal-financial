export function blueFare({distance, transfered}: {distance: number, transfered: boolean}): number {
  let discount = transfered?  14 : 0;
  let fare = 0;
  if (distance === 0) fare = transfered ? 16 : 0;
  if (distance === 1) fare = 17;
  if (distance === 2) fare = 20;
  if (distance === 3) fare = 22;
  if (distance === 4) fare = 25;
  if (distance === 5) fare = 27;
  if (distance === 6) fare = 30;
  if (distance === 7) fare = 32;
  if (distance === 8) fare = 35;
  if (distance === 9) fare = 37;
  if (distance === 10) fare = 40;
  if (distance === 11) fare = 42;
  if (distance >= 12) fare = 45;
  return fare - discount;
}
export function purpleFare({distance, transfered}: {distance: number, transfered: boolean}): number {
  let discount = transfered?  14 : 0;
  let fare = 0;
  if (distance === 0) transfered ? 14:0;
  if (distance === 1) fare = 17;
  if (distance === 2) fare = 20;
  if (distance === 3) fare = 23;
  if (distance === 4) fare = 25;
  if (distance === 5) fare = 27;
  if (distance === 6) fare = 30;
  if (distance === 7) fare = 33;
  if (distance === 8) fare = 36;
  if (distance === 9) fare = 38;
  if (distance === 10)fare = 40;
  if(distance >= 11) fare = 42;
  return fare - discount;
}

export function yellowFare({distance, transfered}: {distance: number, transfered: boolean}): number {
  if(distance === 0 && !transfered) return 0;
  let discount = transfered ?  15 : 0;
  let fare = 0;
  if (distance === 0) fare = 15;
  if (distance === 1) fare = 19;
  if (distance === 2) fare = 23;
  if (distance === 3) fare = 27;
  if (distance === 4) fare = 30;
  if (distance === 5) fare = 33;
  if (distance === 6) fare = 36;
  if (distance === 7) fare = 39;
  if (distance === 8) fare = 42;
  if (distance >= 9) fare = 45;
  return fare - discount;
}
export function pinkFare({distance, transfered}: {distance: number, transfered: boolean}): number {
  if(distance === 0 && !transfered) return 0;
  let discount = transfered ?  15 : 0;
  let fare = 0;
  if (distance === 0) fare = 15;
  if (distance === 1) fare = 18;
  if (distance === 2) fare = 23;
  if (distance === 3) fare = 28;
  if (distance === 4) fare = 30;
  if (distance === 5) fare = 34;
  if (distance === 6) fare = 37;
  if (distance === 7) fare = 41;
  if (distance === 8) fare = 44;
  if (distance >= 9) fare = 45;
  return fare - discount;
}
