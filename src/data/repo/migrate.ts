import { seed, type Database } from "../seed";
import { managementSeed } from "../management/seed";
export function migrateDatabase(old: Partial<Database>): Database {
  const initial = seed();
  const db = { ...initial, ...old };
  const management = managementSeed(db.units);
  db.targets = old.targets ?? management.targets;
  db.tagAudits = old.tagAudits ?? [];
  db.escalations = old.escalations ?? [];
  db.tickets = db.tickets.map((ticket) => ({
    ...ticket,
    assignedRmId:
      ticket.assignedRmId ||
      db.units.find((unit) => unit.id === ticket.unitId)?.rmIds[0],
    team: ticket.team || "Sales Accounts",
  }));
  db.tasks = db.tasks.map((task) => ({
    ...task,
    assignedRmId: task.assignedRmId || "rm1",
  }));
  db.ledger = db.ledger.map((tx) =>
    tx.type === "Receipt" && !tx.managementCategory
      ? {
          ...tx,
          managementCategory: tx.id.startsWith("month")
            ? ("New Billing" as const)
            : ("Regular" as const),
        }
      : tx,
  );
  db.notifications = db.notifications.map((notification) => ({
    ...notification,
    userId: notification.userId || "rm1",
  }));
  return db;
}
