import type { Database, Unit } from "../seed";
import { projects } from "../seed";
import { users, reportingRms } from "../users";
import { finance, segment } from "../rules";
import { monthKey } from "./seed";
export type ScopeFilters = {
  rmId: string;
  tlId: string;
  projectId: string;
  wing: string;
  period: string;
};
export const emptyFilters = (): ScopeFilters => ({
  rmId: "",
  tlId: "",
  projectId: "",
  wing: "",
  period: monthKey(),
});
export const primaryRm = (unit: Unit) => unit.rmIds[0];
export const assignedName = (unit: Unit) =>
  [...new Set(unit.rmIds)]
    .map((id) => users.find((user) => user.id === id)?.name || id)
    .join(", ");
export function filterUnits(units: Unit[], filters: ScopeFilters) {
  return units.filter(
    (unit) =>
      (!filters.rmId || primaryRm(unit) === filters.rmId) &&
      (!filters.tlId ||
        users.find((user) => user.id === primaryRm(unit))?.managerId ===
          filters.tlId) &&
      (!filters.projectId || unit.projectId === +filters.projectId) &&
      (!filters.wing || unit.wing === filters.wing),
  );
}
export function postedIn(date: string, period: string) {
  const d = new Date(date);
  return monthKey(d) === period && d.getTime() <= Date.now();
}
export const receipts = (db: Database, units: Unit[], period: string) => {
  const ids = new Set(units.map((unit) => unit.id));
  return db.ledger.filter(
    (tx) =>
      ids.has(tx.unitId) && tx.type === "Receipt" && postedIn(tx.date, period),
  );
};
export const achieved = (db: Database, units: Unit[], period: string) =>
  receipts(db, units, period).reduce((sum, tx) => sum + tx.credit, 0);
export function targetRecords(
  db: Database,
  userId: string,
  filters: ScopeFilters,
) {
  const rms = new Set(reportingRms(userId).map((user) => user.id));
  return db.targets.filter(
    (t) =>
      rms.has(t.rmId) &&
      t.month === filters.period &&
      (!filters.rmId || t.rmId === filters.rmId) &&
      (!filters.tlId ||
        users.find((u) => u.id === t.rmId)?.managerId === filters.tlId) &&
      (!filters.projectId || t.projectId === +filters.projectId) &&
      (!filters.wing || t.wing === filters.wing),
  );
}
export function totals(db: Database, units: Unit[], period: string) {
  let overdue = 0,
    outstanding = 0;
  for (const unit of units) {
    const f = finance(db, unit);
    overdue += f.overdue;
    outstanding += f.outstanding;
  }
  return { achieved: achieved(db, units, period), overdue, outstanding };
}
export function aging(db: Database, units: Unit[]) {
  const values = [0, 0, 0];
  for (const unit of units) {
    const f = finance(db, unit);
    if (f.overdue > 0)
      values[f.age <= 30 ? 0 : f.age <= 90 ? 1 : 2] += f.overdue;
  }
  return values;
}
export function collectible(db: Database, unit: Unit, period: string) {
  const [year, m] = period.split("-").map(Number);
  const end = new Date(year, m, 0, 23, 59, 59).getTime();
  const tx = db.ledger.filter((t) => t.unitId === unit.id);
  let credits = tx.reduce((s, t) => s + t.credit, 0);
  let value = 0;
  for (const demand of tx
    .filter((t) => t.debit > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    const unpaid = Math.max(0, demand.debit - credits);
    credits = Math.max(0, credits - demand.debit);
    if (demand.dueDate && Date.parse(demand.dueDate) <= end) value += unpaid;
  }
  return value;
}
export function rmPerformance(
  db: Database,
  units: Unit[],
  userId: string,
  filters: ScopeFilters,
) {
  return reportingRms(userId)
    .filter(
      (rm) =>
        (!filters.rmId || rm.id === filters.rmId) &&
        (!filters.tlId || rm.managerId === filters.tlId),
    )
    .map((rm) => {
      const owned = units.filter((u) => primaryRm(u) === rm.id),
        mapped = units.filter((u) => u.rmIds.includes(rm.id));
      const amount = achieved(db, owned, filters.period),
        target = targetRecords(db, userId, { ...filters, rmId: rm.id }).reduce(
          (sum, t) => sum + t.collection,
          0,
        );
      const overdue = owned.reduce((sum, u) => sum + finance(db, u).overdue, 0);
      const ids = new Set(owned.map((u) => u.id));
      return {
        rm,
        owned,
        mapped,
        amount,
        target,
        overdue,
        aging: aging(db, owned),
        tickets: db.tickets.filter((t) => ids.has(t.unitId)),
        towers: [
          ...new Set(
            owned.map((u) => `${projects[u.projectId].name} · ${u.wing}`),
          ),
        ].join(", "),
      };
    });
}
export function categoryPerformance(
  db: Database,
  units: Unit[],
  period: string,
) {
  return (["PC", "Regular", "New Billing"] as const).map((category) => ({
    category,
    amount: receipts(db, units, period)
      .filter((tx) => {
        const unit = units.find((u) => u.id === tx.unitId)!;
        return (
          (unit.tags.includes("Possible Cancellation")
            ? "PC"
            : tx.managementCategory || "Regular") === category
        );
      })
      .reduce((sum, tx) => sum + tx.credit, 0),
  }));
}
export const segmentRows = (db: Database, units: Unit[], period: string) =>
  [1, 2, 3, 4].map((n) => {
    const group = units.filter((u) => segment(db, u) === n);
    return { segment: n, units: group, ...totals(db, group, period) };
  });

export function attributedUnits(units: Unit[], userId: string) {
  const rms = new Set(reportingRms(userId).map((rm) => rm.id));
  return units.filter((unit) => rms.has(primaryRm(unit)));
}
