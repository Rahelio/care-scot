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
import { settingsRouter } from "./routers/settings";
import { reportsRouter } from "./routers/reports";

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
  settings: settingsRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
