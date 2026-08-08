import type { ReactNode } from "react";

// shared shell so /terms and /privacy read as one set
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="font-mono text-xs text-muted-foreground">Last updated {updated}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{intro}</p>
      </header>

      <div className="mt-10 space-y-8">{children}</div>
    </div>
  );
}

export function Clause({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item) => (
        <li
          key={item}
          className="list-disc text-sm leading-relaxed marker:text-muted-foreground/50"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
