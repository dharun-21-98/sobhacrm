import type { Unit } from "../seed";
import { users } from "../users";
import type { Target, TagAudit, Escalation } from "./types";
import { config } from "../config";
export const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
/** Explicit mock CMS records. Views query these records, never infer tower targets. */
export function managementSeed(units: Unit[]) {
  const targets: Target[] = [];
  users
    .filter((user) => user.role === "RM")
    .forEach((rm, index) => {
      const owned = units.filter(
        (unit) => unit.rmIds[0] === rm.id && unit.status !== "Unsold",
      );
      const groups = [
        ...new Set(owned.map((unit) => `${unit.projectId}:${unit.wing}`)),
      ];
      for (const offset of [-2, -1, 0]) {
        const month = monthKey(
          new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1),
        );
        groups.forEach((group) => {
          const [projectId, wing] = group.split(":");
          const share =
            owned.filter((unit) => `${unit.projectId}:${unit.wing}` === group)
              .length / owned.length;
          (["PC", "Regular", "New Billing"] as const).forEach(
            (category, categoryIndex) =>
              targets.push({
                id: `${rm.id}-${month}-${group}-${category}`,
                rmId: rm.id,
                month,
                projectId: +projectId,
                wing,
                category,
                collection:
                  (index === 0
                    ? config.collectionTarget
                    : [0, 68000000, 72000000, 79000000][index]) *
                  share *
                  [0.1, 0.55, 0.35][categoryIndex],
                handover:
                  categoryIndex === 1
                    ? (index === 0 ? config.handoverTarget : 10) * share
                    : 0,
                registration:
                  categoryIndex === 1
                    ? (index === 0 ? config.registrationTarget : 8) * share
                    : 0,
              }),
          );
        });
      }
    });
  return {
    targets,
    tagAudits: [] as TagAudit[],
    escalations: [] as Escalation[],
  };
}
