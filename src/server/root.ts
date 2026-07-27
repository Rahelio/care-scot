import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { signupRouter } from "./routers/signup";
import { billingRouter } from "./routers/billing";
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
import { financialRouter } from "./routers/financial";

export const appRouter = router({
  auth: authRouter,
  signup: signupRouter,
  billing: billingRouter,
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
  financial: financialRouter,
});

export type AppRouter = typeof appRouter;
