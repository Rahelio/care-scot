"use client";

import { use } from "react";
import { RotaVisitList } from "@/components/modules/clients/rota-visit-list";

export default function ClientRotaPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RotaVisitList serviceUserId={id} />;
}
