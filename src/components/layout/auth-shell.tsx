import type { ReactNode } from "react";
import { Card, CardSection } from "@/components/ui/primitives";

export function AuthShell({ title, intro, children, footer }: { title: ReactNode; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Card>
        <CardSection className="sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {intro && <p className="mt-1.5 text-[0.95rem] text-muted">{intro}</p>}
          <div className="mt-6">{children}</div>
        </CardSection>
      </Card>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
