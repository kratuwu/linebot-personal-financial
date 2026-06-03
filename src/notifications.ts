import { pushMessage } from "./lineApi";
import type { MangmoomInsertedExpense } from "./workflow/mangmoom";

type NotificationEnv = {
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  PERSONAL_LINE_ID?: string;
};

type GrabInsertedExpense = {
  source: string;
  amount: number;
  tag: string;
  category: string;
  date?: string;
};

type MangmoomSyncResult = {
  inserted: number;
  insertedExpenses: MangmoomInsertedExpense[];
};

export async function notifyMangmoomInsertedExpenses(
  env: NotificationEnv,
  result: MangmoomSyncResult,
) {
  if (!result.insertedExpenses.length || !env.LINE_CHANNEL_ACCESS_TOKEN) {
    return;
  }

  const to = env.PERSONAL_LINE_ID;
  if (!to) {
    console.log("Skipped Mangmoom LINE notification: no personal LINE ID configured");
    return;
  }

  await pushMessage(
    env.LINE_CHANNEL_ACCESS_TOKEN,
    to,
    buildMangmoomNotificationText(result),
  );
}

export async function notifyGrabInsertedExpense(
  env: NotificationEnv,
  expense: GrabInsertedExpense,
) {
  if (!env.PERSONAL_LINE_ID || !env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.log("Skipped Grab LINE notification: no personal LINE ID configured");
    return;
  }

  await pushMessage(
    env.LINE_CHANNEL_ACCESS_TOKEN,
    env.PERSONAL_LINE_ID,
    buildGrabNotificationText(expense),
  );
}

function buildGrabNotificationText(expense: GrabInsertedExpense) {
  return [
    "บันทึกค่าใช้จ่าย Grab เข้า Notion แล้ว",
    `${expense.source}: ${formatAmount(expense.amount)} บาท`,
    `${expense.tag} / ${expense.category}${expense.date ? ` (${expense.date})` : ""}`,
  ].join("\n");
}

function buildMangmoomNotificationText(result: MangmoomSyncResult) {
  const total = result.insertedExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const details = result.insertedExpenses
    .slice(0, 10)
    .map((expense) =>
      `- ${expense.source}: ${formatAmount(expense.amount)} บาท${
        expense.date ? ` (${expense.date})` : ""
      }`
    );
  if (result.insertedExpenses.length > details.length) {
    details.push(`- และอีก ${result.insertedExpenses.length - details.length} รายการ`);
  }

  return [
    "บันทึกค่าเดินทาง Mangmoom เข้า Notion แล้ว",
    `${result.inserted} รายการ รวม ${formatAmount(total)} บาท`,
    ...details,
  ].join("\n");
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}
