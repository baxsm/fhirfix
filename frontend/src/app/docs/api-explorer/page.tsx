import Link from "next/link";
import { ApiExplorer } from "@/components/docs/api-explorer";

export const metadata = {
  title: "API explorer · FHIRfix",
};

export default function ApiExplorerPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <header className="max-w-2xl space-y-2">
        <p className="text-xs text-muted-foreground">API reference</p>
        <h1 className="text-3xl font-semibold tracking-tight">API explorer</h1>
        <p className="text-muted-foreground">
          Send a real request to the FHIRfix REST API from your browser. Paste a test key from your{" "}
          <Link href="/app" className="text-interactive hover:underline">
            developer settings
          </Link>
          , pick an endpoint, and run it. Test keys never charge live credits.
        </p>
      </header>

      <ApiExplorer />
    </div>
  );
}
