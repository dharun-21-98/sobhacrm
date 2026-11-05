import { config } from "./config";
import { projects } from "./seed";
import type { Database } from "./seed";
import { getUser, reportingRms } from "./users";
export const capabilities = {
  RM: {
    reports: false,
    manageTeam: false,
    importReviews: false,
    editTickets: true,
    setPriority: true,
  },
  TL: {
    reports: true,
    manageTeam: true,
    importReviews: false,
    editTickets: true,
    setPriority: false,
  },
  Leadership: {
    reports: true,
    manageTeam: true,
    importReviews: true,
    editTickets: false,
    setPriority: false,
  },
};
export function authorizedUnits(db: Database, userId: string) {
  const ids = new Set(reportingRms(userId).map((user) => user.id));
  return db.units.filter(
    (unit) => unit.status !== "Unsold" && unit.rmIds.some((id) => ids.has(id)),
  );
}
export function allowedPath(db: Database, userId: string, path: string) {
  const user = getUser(userId);
  if (!user) return false;
  if (path.startsWith("/reports") && !capabilities[user.role].reports)
    return false;
  if (path.startsWith("/escalations") && !capabilities[user.role].importReviews)
    return false;
  const unitId = path.match(
    /^\/(?:customers|handover-registration)\/([^/?]+)/,
  )?.[1];
  const units = authorizedUnits(db, userId);
  if (unitId && !units.some((unit) => unit.id === unitId)) return false;
  const ticketId = path.match(/^\/tickets\/([^/?]+)/)?.[1];
  if (
    ticketId &&
    !db.tickets.some(
      (ticket) =>
        ticket.id === ticketId &&
        units.some((unit) => unit.id === ticket.unitId),
    )
  )
    return false;
  return true;
}
/** Guard the shared mock mutation entrypoint as well as the controls. */
export function assertMutation(
  before: Database,
  after: Database,
  userId: string,
) {
  const user = getUser(userId);
  if (!user) throw new Error("Please log in before changing data.");
  const allowed = new Set(
    authorizedUnits(before, userId).map((unit) => unit.id),
  );
  const rms = new Set(reportingRms(userId).map((rm) => rm.id));
  const changed = <T extends { id: string }>(a: T[], b: T[]) => {
    const previous = new Map(a.map((item) => [item.id, item]));
    const current = new Map(b.map((item) => [item.id, item]));
    return [...new Set([...previous.keys(), ...current.keys()])]
      .filter(
        (id) =>
          JSON.stringify(previous.get(id)) !== JSON.stringify(current.get(id)),
      )
      .map((id) => ({ old: previous.get(id), next: current.get(id) }));
  };
  if (
    JSON.stringify(before.ledger) !== JSON.stringify(after.ledger) ||
    JSON.stringify(before.targets) !== JSON.stringify(after.targets)
  )
    throw new Error("Finance and CMS targets are read-only.");
  for (const { old, next } of changed(before.units, after.units)) {
    if (
      !old ||
      !next ||
      !allowed.has(old.id) ||
      old.rmIds.join() !== next.rmIds.join()
    )
      throw new Error("Unit outside your portfolio.");
    if (next.tags.some((tag) => !config.tags.includes(tag)))
      throw new Error("Choose tags from the fixed list.");
    if (
      JSON.stringify(old.tags) !== JSON.stringify(next.tags) &&
      user.role !== "RM"
    ) {
      const audit = after.tagAudits.find(
        (a) =>
          !before.tagAudits.some((b) => b.id === a.id) &&
          a.unitId === old.id &&
          a.actorId === userId &&
          a.reason.trim() &&
          JSON.stringify(a.before) === JSON.stringify(old.tags) &&
          JSON.stringify(a.after) === JSON.stringify(next.tags),
      );
      if (!audit)
        throw new Error("A supervisory tag override requires an audit reason.");
    }
  }
  for (const key of [
    "remarks",
    "visits",
    "documents",
    "upsells",
    "tagAudits",
  ] as const) {
    for (const { old, next } of changed<{ id: string; unitId: string }>(
      before[key],
      after[key],
    )) {
      const item = next || old!;
      if (
        !allowed.has(item.unitId) ||
        (old && next && old.unitId !== next.unitId)
      )
        throw new Error("Record outside your portfolio.");
      if (key === "remarks") {
        const prior = old as Database["remarks"][number] | undefined,
          remark = next as Database["remarks"][number] | undefined;
        if (
          (prior && prior.author !== user.name) ||
          (remark && (remark.author !== user.name || remark.role !== user.role))
        )
          throw new Error("You can edit only your own remarks.");
        if (
          remark?.ticketId &&
          !before.tickets.some(
            (ticket) =>
              ticket.id === remark.ticketId && ticket.unitId === remark.unitId,
          )
        )
          throw new Error(
            "Remark must link to an accessible ticket for this unit.",
          );
        if (remark && !remark.text.trim())
          throw new Error("A remark cannot be empty.");
        if (
          !capabilities[user.role].editTickets &&
          (remark?.ticketId || prior?.ticketId)
        )
          throw new Error("Leadership ticket oversight is read-only.");
      }
    }
  }
  for (const { old, next } of changed(before.tagAudits, after.tagAudits)) {
    if (
      old ||
      !next ||
      next.actorId !== user.id ||
      next.role !== user.role ||
      !next.reason.trim()
    )
      throw new Error(
        "Tag audit history is append-only and attributed to the current user.",
      );
  }
  if (
    user.role === "RM" &&
    JSON.stringify(before.kb) !== JSON.stringify(after.kb)
  )
    throw new Error("Only supervisors upload knowledge resources.");
  for (const { old, next } of changed(
    before.notifications,
    after.notifications,
  )) {
    if (old && (old.userId !== user.id || next?.userId !== user.id))
      throw new Error("Notification outside your user scope.");
    if (
      !old &&
      next &&
      (!capabilities[user.role].manageTeam || !rms.has(next.userId))
    )
      throw new Error("Task notification outside your team.");
  }
  for (const { old, next } of changed(before.tickets, after.tickets)) {
    if (!capabilities[user.role].editTickets)
      throw new Error("Leadership ticket oversight is read-only.");
    if (![old, next].filter(Boolean).every((item) => allowed.has(item!.unitId)))
      throw new Error("Ticket outside your portfolio.");
    if (
      (old?.priority || "") !== (next?.priority || "") &&
      !capabilities[user.role].setPriority
    )
      throw new Error("Only the RM sets ticket priority.");
  }
  for (const { old, next } of changed(before.tasks, after.tasks)) {
    const task = next || old!;
    if (!rms.has(task.assignedRmId) || (old && !rms.has(old.assignedRmId)))
      throw new Error("Task outside your team.");
    if (
      task.unitId &&
      !before.units.some(
        (u) =>
          u.id === task.unitId &&
          allowed.has(u.id) &&
          u.rmIds.includes(task.assignedRmId),
      )
    )
      throw new Error("Task unit must belong to the assigned RM.");
    if (
      !old &&
      next &&
      (!next.title.trim() ||
        !next.description.trim() ||
        !next.unitId ||
        next.createdById !== user.id ||
        next.status !== "Open")
    )
      throw new Error(
        "New tasks need a title, description, linked unit and creator.",
      );
    if (!old && !capabilities[user.role].manageTeam)
      throw new Error("Only supervisors create tasks.");
  }
  for (const key of ["handovers", "registrations"] as const)
    for (const id of new Set([
      ...Object.keys(before[key]),
      ...Object.keys(after[key]),
    ])) {
      if (JSON.stringify(before[key][id]) === JSON.stringify(after[key][id]))
        continue;
      if (!allowed.has(id)) throw new Error("Unit outside your portfolio.");
      const unit = after.units.find((unit) => unit.id === id)!;
      if (key === "handovers" && after.handovers[id]?.status === "Initiated") {
        const balance = after.ledger
          .filter((tx) => tx.unitId === id)
          .reduce((sum, tx) => sum + tx.debit - tx.credit, 0);
        if (!unit.ready || !unit.tds || Math.abs(balance) > 0.01)
          throw new Error(
            "Handover initiation requires CMS readiness, zero balance and TDS.",
          );
      }
      if (
        key === "handovers" &&
        after.handovers[id]?.status === "Completed" &&
        (!after.documents.some(
          (doc) =>
            doc.unitId === id &&
            doc.bucket === "Handover" &&
            doc.type === "Customer sign-off",
        ) ||
          before.handovers[id]?.status !== "Appointment Booked")
      )
        throw new Error(
          "Handover completion requires an appointment and customer sign-off.",
        );
      if (key === "registrations" && after.registrations[id]) {
        if (!projects[unit.projectId].oc)
          throw new Error("Registration is inactive until OC is received.");
        if (
          after.registrations[id].status === "Completed" &&
          (!before.registrations[id] ||
            !after.documents.some(
              (doc) =>
                doc.unitId === id &&
                doc.bucket === "Registration" &&
                doc.type === "Sale deed",
            ))
        )
          throw new Error(
            "Registration completion requires collected details and a sale deed.",
          );
      }
    }
  for (const { old, next } of changed(before.escalations, after.escalations)) {
    if (!capabilities[user.role].importReviews)
      throw new Error("Leadership access required.");
    if (!allowed.has((next || old!).unitId))
      throw new Error("Review unit is unavailable.");
  }
}
