"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "@/lib/savings";

function sheetPath(spreadsheetId: string) {
  return `/dashboard/sheet/${spreadsheetId}`;
}

export async function addSavingsGoal(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const spreadsheetId  = formData.get("spreadsheetId") as string;
  const name           = (formData.get("name") as string)?.trim();
  const description    = (formData.get("description") as string)?.trim() ?? "";
  const targetAmount   = parseFloat(formData.get("targetAmount") as string);
  const currentAmount  = parseFloat(formData.get("currentAmount") as string) || 0;
  const color          = (formData.get("color") as string) || "#a78bfa";

  if (!spreadsheetId || !name || isNaN(targetAmount) || targetAmount <= 0)
    throw new Error("Invalid input");

  const db = await getDB();
  await createSavingsGoal(db, { spreadsheetId, name, description, targetAmount, currentAmount, color });
  revalidatePath(sheetPath(spreadsheetId), "layout");
}

export async function editSavingsGoal(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const id             = parseInt(formData.get("id") as string);
  const spreadsheetId  = formData.get("spreadsheetId") as string;
  const name           = (formData.get("name") as string)?.trim();
  const description    = (formData.get("description") as string)?.trim();
  const targetAmount   = parseFloat(formData.get("targetAmount") as string);
  const currentAmount  = parseFloat(formData.get("currentAmount") as string);
  const color          = formData.get("color") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const db = await getDB();
  await updateSavingsGoal(db, id, spreadsheetId, {
    ...(name        ? { name }                          : {}),
    ...(description !== undefined ? { description }     : {}),
    ...(!isNaN(targetAmount)  ? { target_amount: targetAmount }   : {}),
    ...(!isNaN(currentAmount) ? { current_amount: currentAmount } : {}),
    ...(color       ? { color }                         : {}),
  });
  revalidatePath(sheetPath(spreadsheetId), "layout");
}

export async function removeSavingsGoal(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const id            = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const db = await getDB();
  await deleteSavingsGoal(db, id, spreadsheetId);
  revalidatePath(sheetPath(spreadsheetId), "layout");
}
