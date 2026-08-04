import { router, protectedProcedure } from "../trpc";
import { hasPermission, hasRole, MODULE_PERMISSIONS } from "../middleware/rbac";

/**
 * One summary stat per dashboard module card. Each field is `null` when the
 * caller's role lacks the permission that module's detail page would
 * require — the card then falls back to showing just its description, no
 * number, rather than a value the user couldn't actually see if they
 * clicked through.
 */
export const dashboardRouter = router({
  getModuleSummary: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.user.role;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const days90Future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      activeClients,
      activeStaff,
      openMedErrors,
      openIncidents,
      overduePolicyReviews,
      expiringCerts,
      unassignedVisitsToday,
    ] = await Promise.all([
      hasPermission(role, "clients.read")
        ? ctx.db.serviceUser.count({ where: { status: "ACTIVE" } })
        : Promise.resolve(null),
      hasPermission(role, "staff.read")
        ? ctx.db.staffMember.count({ where: { status: "ACTIVE" } })
        : Promise.resolve(null),
      hasPermission(role, "medication.read")
        ? ctx.db.medicationError.count({ where: { investigatedBy: null } })
        : Promise.resolve(null),
      hasPermission(role, "incidents.read_own")
        ? ctx.db.incident.count({ where: { status: { not: "CLOSED" } } })
        : Promise.resolve(null),
      hasRole(role, MODULE_PERMISSIONS.compliance.read)
        ? ctx.db.policy.count({ where: { status: "ACTIVE", nextReviewDate: { lt: now } } })
        : Promise.resolve(null),
      hasPermission(role, "staff.read")
        ? ctx.db.staffPvgRecord
            .count({ where: { renewalDate: { lte: days90Future, gte: now } } })
            .then(async (pvg) => {
              const sssc = await ctx.db.staffRegistration.count({
                where: { registrationType: "SSSC", expiryDate: { lte: days90Future, gte: now } },
              });
              return pvg + sssc;
            })
        : Promise.resolve(null),
      hasPermission(role, "rota.read")
        ? ctx.db.rotaVisit.count({
            where: {
              visitDate: { gte: todayStart, lt: todayEnd },
              status: { in: ["UNASSIGNED", "PARTIALLY_ASSIGNED"] },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      clients: { activeCount: activeClients },
      staff: { activeCount: activeStaff, expiringCertsCount: expiringCerts },
      medication: { openErrorsCount: openMedErrors },
      incidents: { openCount: openIncidents },
      compliance: { overduePolicyReviewsCount: overduePolicyReviews },
      rota: { unassignedTodayCount: unassignedVisitsToday },
    };
  }),
});
