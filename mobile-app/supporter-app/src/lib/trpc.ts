import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../../src/server/root";

export const trpc = createTRPCReact<AppRouter>();
