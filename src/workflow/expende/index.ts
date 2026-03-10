import { Client } from "@notionhq/client";

export async function insertTransportation(
  notionToken: string,
  expendeDatabaseId: string,
  source: string,
  amount: number,
) {
  await insertExpend(
    notionToken,
    expendeDatabaseId,
    "Transportation",
    source,
    amount,
    "Consumable",
  );
}

export async function insertExpend(
  notionToken: string,
  expendeDatabaseId: string,
  tag: string,
  source: string,
  amount: number,
  category: string,
) {
  const notion = new Client({
    auth: notionToken,
    fetch: fetch.bind(globalThis),
  });

  const now = new Date();

  const date = now.toISOString().split("T")[0]; // 2026-03-08
  const month = now.toLocaleString("en-US", { month: "long" }); // March

  return notion.pages.create({
    parent: {
      database_id: expendeDatabaseId,
    },
    properties: {
      Source: {
        title: [{ text: { content: source } }],
      },
      Amount: { number: amount },
      Date: { date: { start: date } },
      Month: {
        relation: [
          {
            id: months[month as keyof typeof months],
          },
        ],
      },
      Tag: { select: { name: tag } },
      Category: { select: { name: category } },
    },
  });
}

const months = {
  January: "2f43ad992bf08145824fee3c010c75fd",
  February: "2f43ad992bf08155a856d07b6689af47",
  March: "2f43ad992bf081b49e7bce377ded3e8a",
  April: "2f43ad992bf081ef8892e4d7a6398d99",
  May: "2f43ad992bf081baba35e26052a3a8ae",
  June: "2f43ad992bf081739f9afffa132dff1e",
  July: "2f43ad992bf08141a5c3cc024c045fac",
  August: "2f43ad992bf081ef88cee063833e1df2",
  September: "2f43ad992bf08123acdae1dd120a43d3",
  October: "2f43ad992bf081528412d3213a4a6223",
  November: "2f43ad992bf081bc8495e9a0c8f2d02b",
  December: "3013ad992bf08091aeb6e7eb405d6d5f",
};
