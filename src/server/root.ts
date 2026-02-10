import { router } from "./trpc";
import { clientsRouter } from "./routers/clients";
import { staffRouter } from "./routers/staff";
import { medicationRouter } from "./routers/medication";
import { incidentsRouter } from "./routers/incidents";
import { complianceRouter } from "./routers/compliance";
import { rotaRouter } from "./routers/rota";

export const appRouter = router({
  clients: clientsRouter,
  staff: staffRouter,
  medication: medicationRouter,
  incidents: incidentsRouter,
  compliance: complianceRouter,
  rota: rotaRouter,
});

export type AppRouter = typeof appRouter;
