"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reclassifyCategories,
  getCategories,
} from "@/lib/classify";

function sheetPath(spreadsheetId: string) {
  return `/dashboard/sheet/${spreadsheetId}`;
}

export async function addCategory(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const spreadsheetId = formData.get("spreadsheetId") as string;
  const name          = (formData.get("name") as string)?.trim();
  const color         = (formData.get("color") as string) || "#a78bfa";
  const rawPatterns   = (formData.get("patterns") as string) || "";

  if (!spreadsheetId || !name) throw new Error("Invalid input");

  const patterns = rawPatterns
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const db = await getDB();
  await createCategory(db, { spreadsheetId, name, color, patterns });
  await reclassifyCategories(db, spreadsheetId, []);

  revalidatePath(sheetPath(spreadsheetId), "layout");
}

export async function editCategoryPatterns(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id            = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const rawPatterns   = (formData.get("patterns") as string) || "";
  const name          = (formData.get("name") as string)?.trim();
  const color         = (formData.get("color") as string) || undefined;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const patterns = rawPatterns
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const db = await getDB();

  // Fetch current name so we can reset rows that were classified under it
  const cats = await getCategories(db, spreadsheetId);
  const existing = cats.find((c) => c.id === id);
  const affectedNames = existing ? [existing.name] : [];

  await updateCategory(db, id, spreadsheetId, {
    ...(name  ? { name }  : {}),
    ...(color ? { color } : {}),
    patterns,
  });

  await reclassifyCategories(db, spreadsheetId, affectedNames);

  revalidatePath(sheetPath(spreadsheetId), "layout");
}

export async function removeCategory(formData: FormData) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const id            = parseInt(formData.get("id") as string);
  const spreadsheetId = formData.get("spreadsheetId") as string;

  if (isNaN(id) || !spreadsheetId) throw new Error("Invalid input");

  const db = await getDB();
  await deleteCategory(db, id, spreadsheetId);

  revalidatePath(sheetPath(spreadsheetId), "layout");
}
