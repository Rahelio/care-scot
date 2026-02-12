import { ServiceUserTable } from "@/components/modules/clients/service-user-table";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients — CareScot" };

export default function ClientsPage() {
  return <ServiceUserTable />;
}
