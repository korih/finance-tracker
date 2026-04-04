"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getOrCreateUserAccount } from "@/lib/user-account";
import { setBudget, removeCategoryBudget } from "@/lib/budgets";

export async function setMonthlyBudget(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const amountRaw = (formData.get("amount") as string)?.replace(/[^0-9.]/g, "");
  const amount = parseFloat(amountRaw);

  if (!spreadsheetId || isNaN(amount) || amount < 0) throw new Error("Invalid input");

  const db = await getDB();
  const account = await getOrCreateUserAccount(db, session.user.id);
  await setBudget(db, account.spreadsheet_id, account.user_id, "", amount);

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/budget`);
}

export async function setCategoryBudget(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const category = (formData.get("category") as string)?.trim();
  const amountRaw = (formData.get("amount") as string)?.replace(/[^0-9.]/g, "");
  const amount = parseFloat(amountRaw);

  if (!spreadsheetId || !category || isNaN(amount) || amount <= 0) throw new Error("Invalid input");

  const db = await getDB();
  const account = await getOrCreateUserAccount(db, session.user.id);
  await setBudget(db, account.spreadsheet_id, account.user_id, category, amount);

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/budget`);
}

export async function deleteCategoryBudget(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const category = (formData.get("category") as string)?.trim();

  if (!spreadsheetId || !category) throw new Error("Invalid input");

  const db = await getDB();
  await removeCategoryBudget(db, spreadsheetId, category);

  revalidatePath(`/dashboard/sheet/${spreadsheetId}/budget`);
}
