"use client";

import * as React from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { rotateApiId } from "@/app/actions/user-account";

interface Props {
  apiId: string;
  baseUrl: string;
}

export function ApiKeyPanel({ apiId, baseUrl }: Props) {
  const router = useRouter();
  const [copiedId, setCopiedId]         = React.useState(false);
  const [copiedUrl, setCopiedUrl]       = React.useState(false);
  const [pending, setPending]           = React.useState(false);

  const exampleUrl = `${baseUrl}/api/ingest?id=${apiId}&merchant=Walmart&amount=25.50&card=Visa`;

  async function copy(text: string, which: "id" | "url") {
    await navigator.clipboard.writeText(text);
    if (which === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }

  async function handleRotate() {
    if (
      !confirm(
        "This will invalidate your current API ID immediately. Any device or script using it will stop working until updated. Continue?"
      )
    )
      return;
    setPending(true);
    try {
      await rotateApiId();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* API ID row */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          API ID
        </p>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono truncate"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--accent)" }}
          >
            {apiId}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Copy API ID"
            onClick={() => copy(apiId, "id")}
          >
            {copiedId ? (
              <Check className="h-4 w-4" style={{ color: "var(--accent2)" }} />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            title="Regenerate API ID (invalidates current)"
            onClick={handleRotate}
            disabled={pending}
          >
            <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Treat this like a password — anyone who has it can submit transactions to your account.
          Use the rotate button to generate a new one if it gets compromised.
        </p>
      </div>

      {/* Endpoint */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Ingest endpoint
        </p>
        <div className="flex items-start gap-2">
          <div
            className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono break-all leading-relaxed"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}
          >
            GET {exampleUrl}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 mt-0.5"
            title="Copy endpoint"
            onClick={() => copy(exampleUrl, "url")}
          >
            {copiedUrl ? (
              <Check className="h-4 w-4" style={{ color: "var(--accent2)" }} />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Required:</span>{" "}
          <code>id</code>, <code>merchant</code>, <code>amount</code> ·{" "}
          <span className="text-foreground font-medium">Optional:</span>{" "}
          <code>card</code> (defaults to &ldquo;Unknown&rdquo;)
        </p>
      </div>
    </div>
  );
}
