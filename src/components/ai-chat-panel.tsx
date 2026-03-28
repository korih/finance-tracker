"use client";

import * as React from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { askFinanceAI } from "@/app/actions/ai-chat";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiChatPanel({ spreadsheetId }: { spreadsheetId: string }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const { answer } = await askFinanceAI(question, spreadsheetId);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Side tab button — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5 bg-primary text-primary-foreground px-2 py-4 rounded-l-xl shadow-lg hover:bg-primary/90 transition-colors"
        title={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <Bot className="h-4 w-4" />
        <span
          className="text-[10px] font-semibold tracking-widest"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
        >
          AI
        </span>
      </button>

      {/* Sliding panel */}
      <div
        className={[
          "fixed top-0 right-0 h-full w-80 bg-card border-l shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Finance AI</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8 space-y-3">
              <Bot className="h-8 w-8 mx-auto opacity-30" />
              <p>Ask me anything about your finances.</p>
              <div className="space-y-1.5 text-xs text-left bg-muted rounded-lg p-3">
                <p className="font-medium text-foreground mb-2">Try asking:</p>
                {[
                  "How much did I spend in March?",
                  "What are my top merchants this year?",
                  "How much did I earn last month?",
                  "What's my net for 2026?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="block w-full text-left hover:text-foreground transition-colors py-0.5"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={[
                "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                  : "mr-auto bg-muted text-foreground rounded-bl-sm",
              ].join(" ")}
            >
              {msg.content}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-card">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances…"
              rows={1}
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-32 overflow-y-auto"
              style={{ minHeight: "38px" }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Backdrop (closes panel on mobile tap) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
