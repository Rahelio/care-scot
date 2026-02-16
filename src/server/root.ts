import { router } from "./trpc";
import { clientsRouter } from "./routers/clients";
import { staffRouter } from "./routers/staff";
import { medicationRouter } from "./routers/medication";
import { incidentsRouter } from "./routers/incidents";
import { complianceRouter } from "./routers/compliance";
import { rotaRouter } from "./routers/rota";
import { auditRouter } from "./routers/audit";
import { filesRouter } from "./routers/files";
import { notificationsRouter } from "./routers/notifications";

export const appRouter = router({
  clients: clientsRouter,
  staff: staffRouter,
  medication: medicationRouter,
  incidents: incidentsRouter,
  compliance: complianceRouter,
  rota: rotaRouter,
  audit: auditRouter,
  files: filesRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
