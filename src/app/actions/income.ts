"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { insertIncomeEntry, deleteIncomeEntry, type IncomeType } from "@/lib/income";
import { getDB } from "@/lib/db";

export async function addIncomeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const source = (formData.get("source") as string)?.trim();
  const type = (formData.get("type") as IncomeType) ?? "income";
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string; // YYYY-MM-DD

  if (!spreadsheetId || !source || isNaN(amount) || amount <= 0 || !date) {
    throw new Error("Invalid input");
  }

  await insertIncomeEntry({ spreadsheetId, source, type, amount, date });

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/income`);
}

export async function updateIncomeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const source = (formData.get("source") as string)?.trim();
  const type = (formData.get("type") as IncomeType) ?? "income";
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;

  if (isNaN(id) || !spreadsheetId || !source || isNaN(amount) || amount <= 0 || !date) {
    throw new Error("Invalid input");
  }

  const db = await getDB();
  await db
    .prepare(
      `UPDATE income_entries SET source = ?, type = ?, amount = ?, date = ?
       WHERE id = ? AND spreadsheet_id = ?`
    )
    .bind(source, type, amount, date, id, spreadsheetId)
    .run();

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/income`);
}

export async function removeIncomeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;
  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  await deleteIncomeEntry(id);
  revalidatePath(`/dashboard/sheet/${spreadsheetId}/income`);
}
