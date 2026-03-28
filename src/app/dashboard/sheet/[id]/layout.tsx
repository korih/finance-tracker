import type { ReactNode } from "react";
import { AiChatPanel } from "@/components/ai-chat-panel";

export default async function SheetLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      {children}
      <AiChatPanel spreadsheetId={id} />
    </>
  );
}
