"use client";

import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

type Endpoint = "validate" | "fix" | "convert";

const ENDPOINTS: { id: Endpoint; label: string }[] = [
  { id: "validate", label: "POST /validate" },
  { id: "fix", label: "POST /fix" },
  { id: "convert", label: "POST /convert" },
];

const SAMPLE = `{
  "resourceType": "Patient",
  "id": "example",
  "gender": "M",
  "name": [{ "family": "Doe", "given": ["Jane"] }]
}`;

interface ApiResult {
  status: number;
  ok: boolean;
  body: string;
}

export function ApiExplorer() {
  const [endpoint, setEndpoint] = useState<Endpoint>("fix");
  const [apiKey, setApiKey] = useState("");
  const [input, setInput] = useState(SAMPLE);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const base = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

  const curl = [
    `curl ${base}/${endpoint} \\`,
    `  -H "Authorization: Bearer ${apiKey || "ffx_test_..."}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${JSON.stringify({ input })}'`,
  ].join("\n");

  const run = async () => {
    if (!apiKey.trim()) {
      setResult({ status: 0, ok: false, body: "Paste a test API key first." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${base}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // non-json body (rare); show it raw.
      }
      setResult({ status: res.status, ok: res.ok, body: pretty });
    } catch {
      setResult({
        status: 0,
        ok: false,
        body: "Could not reach the API. Check the base URL and your network.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* left: build the request. */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pg-endpoint">Endpoint</Label>
          <div className="inline-flex rounded-md border p-0.5">
            {ENDPOINTS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEndpoint(e.id)}
                className={cn(
                  "cursor-pointer rounded px-2.5 py-1 font-mono text-xs transition-colors",
                  endpoint === e.id
                    ? "bg-foreground/[0.07] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pg-key">Test API key</Label>
          <Input
            id="pg-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ffx_test_..."
            className="font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pg-input">Request body: input</Label>
          <textarea
            id="pg-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="h-56 w-full resize-none rounded-md border bg-muted/40 p-2.5 font-mono text-[11px] leading-[1.7] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Real request from your browser. Test keys never charge live credits.
          </p>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Play />}
            {loading ? "Running..." : "Send request"}
          </Button>
        </div>
      </div>

      {/* right: the curl equivalent + live response. */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            Equivalent curl
          </p>
          <CodeBlock code={curl} label="curl" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Response
            </p>
            {result && result.status > 0 && (
              <span
                className={cn(
                  "inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] tabular-nums",
                  result.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                )}
              >
                {result.status}
              </span>
            )}
          </div>
          {result ? (
            <CodeBlock code={result.body} label="body" />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground">
              Send a request to see the response.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
