"use server";

// Placeholder — implementation will follow after UI proposal is approved.
// The action will:
//   1. Auth-check the session
//   2. Gather financial context (recent transactions, income entries, stats)
//   3. Build a system prompt with the context
//   4. Send the user question to Workers AI
//   5. Return the model's response

export async function askFinanceAI(
  _question: string,
  _spreadsheetId: string
): Promise<{ answer: string }> {
  throw new Error("AI chat not yet implemented");
}
