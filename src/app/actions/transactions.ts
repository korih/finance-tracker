"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  getDB,
  hardDeleteTransaction,
  softDeleteTransaction,
  restoreTransaction,
} from "@/lib/db";

export async function addTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const merchant = (formData.get("merchant") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const timestamp = formData.get("timestamp") as string; // YYYY-MM-DD
  const card = (formData.get("card") as string)?.trim();

  if (!spreadsheetId || !merchant || isNaN(amount) || amount <= 0 || !timestamp || !card) {
    throw new Error("Invalid input");
  }

  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO transactions
         (timestamp, merchant, name, amount, card, spreadsheet_id, row_index, source, excluded)
       VALUES (?, ?, '', ?, ?, ?, NULL, 'manual', 0)`
    )
    .bind(timestamp, merchant, amount, card, spreadsheetId)
    .run();

  revalidatePath(`/dashboard/sheet/${spreadsheetId}`);
}

export async function removeTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id = parseInt(formData.get("id") as string);
  const source = formData.get("source") as string;
  const spreadsheetId = formData.get("spreadsheetId") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const db = await getDB();

  if (source === "manual") {
    await hardDeleteTransaction(db, id);
  } else {
    // sheet + recurring: soft-delete so recurring unique index prevents regeneration
    await softDeleteTransaction(db, id);
  }

  revalidatePath(`/dashboard/sheet/${spreadsheetId}`);
}

export async function updateTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const merchant = (formData.get("merchant") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const timestamp = formData.get("timestamp") as string;
  const card = (formData.get("card") as string)?.trim();

  if (isNaN(id) || !spreadsheetId || !merchant || isNaN(amount) || amount <= 0 || !timestamp || !card) {
    throw new Error("Invalid input");
  }

  const db = await getDB();
  await db
    .prepare(
      `UPDATE transactions SET merchant = ?, amount = ?, timestamp = ?, card = ?
       WHERE id = ? AND spreadsheet_id = ?`
    )
    .bind(merchant, amount, timestamp, card, id, spreadsheetId)
    .run();

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/expenses`);
}

export async function unexcludeTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const db = await getDB();
  await restoreTransaction(db, id);

  revalidatePath(`/dashboard/sheet/${spreadsheetId}`);
}
