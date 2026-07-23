import type { ReactNode } from "react";
import { BackLink } from "./back-link";

interface NewPageHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  description: ReactNode;
}

export function NewPageHeader({ backHref, backLabel, title, description }: NewPageHeaderProps) {
  return (
    <>
      <BackLink href={backHref} label={backLabel} />
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
    </>
  );
}
