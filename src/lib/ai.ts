import { getCloudflareContext } from "@opennextjs/cloudflare";

// Workers AI binding type (matches Cloudflare's Ai class)
interface CloudflareAI {
  run(
    model: string,
    inputs: { messages: { role: string; content: string }[] }
  ): Promise<{ response?: string }>;
}

export async function getAI(): Promise<CloudflareAI> {
  const { env } = await getCloudflareContext({ async: true });
  const ai = (env as unknown as { AI: CloudflareAI }).AI;
  if (!ai) throw new Error("AI binding not available");
  return ai;
}

export const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
