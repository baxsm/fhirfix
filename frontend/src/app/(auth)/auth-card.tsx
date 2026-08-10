import type { ReactNode } from "react";

type Props = {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>

      {footer ? (
        <div className="border-t bg-muted/40 px-6 py-4 text-center text-sm text-muted-foreground sm:px-8">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
