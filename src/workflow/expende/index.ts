

export async function insertTransportation(
  source: string,
  amount: number
) {
  console.log("Inserting Transportation:", { amount, source });
}

export async function insertExpend(
  tag: string,
  source: string,
  amount: number,
  category: string,
) {
  console.log("Inserting Transportation Fare:", { source, amount });
}
