"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { createRecurringRule, removeRecurringRule, updateRecurringRule, type RecurrenceType, type RecurringRule } from "@/lib/recurring";
import type { IncomeType } from "@/lib/income";

export async function addRecurringExpense(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const merchant      = (formData.get("merchant") as string)?.trim();
  const card          = (formData.get("card") as string)?.trim();
  const amount        = parseFloat(formData.get("amount") as string);
  const startDate     = formData.get("timestamp") as string; // YYYY-MM-DD
  const recurrenceType = (formData.get("recurrence_type") as RecurrenceType) ?? "monthly";
  const recurrenceDays = formData.get("recurrence_days")
    ? parseInt(formData.get("recurrence_days") as string)
    : null;

  if (!spreadsheetId || !merchant || isNaN(amount) || amount <= 0 || !startDate || !card) {
    throw new Error("Invalid input");
  }

  const db = await getDB();
  await createRecurringRule(db, {
    spreadsheet_id:  spreadsheetId,
    entry_type:      "expense",
    merchant,
    card,
    income_source:   null,
    income_type:     null,
    amount,
    recurrence_type: recurrenceType,
    recurrence_days: recurrenceType === "custom" ? recurrenceDays : null,
    start_date:      startDate,
    next_due_date:   startDate, // immediately due so first run generates start_date entry
  });

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/expenses`);
}

export async function addRecurringIncome(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const spreadsheetId  = formData.get("spreadsheetId") as string;
  const incomeSource   = (formData.get("source") as string)?.trim();
  const incomeType     = (formData.get("type") as IncomeType) ?? "income";
  const amount         = parseFloat(formData.get("amount") as string);
  const startDate      = formData.get("date") as string;
  const recurrenceType = (formData.get("recurrence_type") as RecurrenceType) ?? "monthly";
  const recurrenceDays = formData.get("recurrence_days")
    ? parseInt(formData.get("recurrence_days") as string)
    : null;

  if (!spreadsheetId || !incomeSource || isNaN(amount) || amount <= 0 || !startDate) {
    throw new Error("Invalid input");
  }

  const db = await getDB();
  await createRecurringRule(db, {
    spreadsheet_id:  spreadsheetId,
    entry_type:      "income",
    merchant:        null,
    card:            null,
    income_source:   incomeSource,
    income_type:     incomeType,
    amount,
    recurrence_type: recurrenceType,
    recurrence_days: recurrenceType === "custom" ? recurrenceDays : null,
    start_date:      startDate,
    next_due_date:   startDate,
  });

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/income`);
}

export async function deleteRecurringRule(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id             = parseInt(formData.get("id") as string);
  const spreadsheetId  = formData.get("spreadsheetId") as string;
  const entryType      = formData.get("entry_type") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const db = await getDB();
  await removeRecurringRule(db, id, spreadsheetId);

  const path = entryType === "income"
    ? `/dashboard/sheet/${spreadsheetId}/income`
    : `/dashboard/sheet/${spreadsheetId}/expenses`;

  revalidatePath(path);
}

export async function editRecurringRule(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id            = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const entryType     = formData.get("entry_type") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const amount        = parseFloat(formData.get("amount") as string);
  const recurrenceType = (formData.get("recurrence_type") as RecurrenceType) ?? "monthly";
  const recurrenceDays = formData.get("recurrence_days")
    ? parseInt(formData.get("recurrence_days") as string)
    : null;

  const db = await getDB();

  if (entryType === "income") {
    const incomeSource = (formData.get("source") as string)?.trim();
    const incomeType   = formData.get("type") as RecurringRule["income_type"];
    await updateRecurringRule(db, id, spreadsheetId, {
      income_source:   incomeSource,
      income_type:     incomeType,
      amount,
      recurrence_type: recurrenceType,
      recurrence_days: recurrenceType === "custom" ? recurrenceDays : null,
    });
    revalidatePath(`/dashboard/sheet/${spreadsheetId}/income`);
  } else {
    const merchant = (formData.get("merchant") as string)?.trim();
    const card     = (formData.get("card") as string)?.trim();
    await updateRecurringRule(db, id, spreadsheetId, {
      merchant,
      card,
      amount,
      recurrence_type: recurrenceType,
      recurrence_days: recurrenceType === "custom" ? recurrenceDays : null,
    });
    revalidatePath(`/dashboard/sheet/${spreadsheetId}/expenses`);
  }
}
