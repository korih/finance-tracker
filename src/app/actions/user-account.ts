"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { regenerateApiId } from "@/lib/user-account";

export async function rotateApiId(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const db = await getDB();
  await regenerateApiId(db, session.user.id);
  revalidatePath("/dashboard", "layout");
}
