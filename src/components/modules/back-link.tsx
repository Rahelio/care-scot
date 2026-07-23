import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackLinkProps {
  href: string;
  label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link href={href}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        {label}
      </Link>
    </Button>
  );
}
