import { describe, it, expect } from "vitest";
import { seed } from "../seed";
import { authorizedUnits, allowedPath, assertMutation } from "../access";
import { reportingRms } from "../users";
import {
  emptyFilters,
  rmPerformance,
  totals,
  attributedUnits,
  targetRecords,
  categoryPerformance,
  aging,
  filterUnits,
} from "./queries";
import { migrateDatabase } from "../repo/migrate";
import {
  validateReviews,
  commitReviews,
} from "../../features/escalations/import";
const mutate = (fn: (db: ReturnType<typeof seed>) => void, user = "tl1") => {
  const before = seed(),
    after = structuredClone(before);
  fn(after);
  return () => assertMutation(before, after, user);
};
describe("persona scope and permissions", () => {
  it("scopes hierarchy and direct links without losing shared mappings", () => {
    const db = seed();
    expect(reportingRms("tl1").map((r) => r.id)).toEqual(["rm1", "rm2", "rm3"]);
    expect(authorizedUnits(db, "tl1").some((u) => u.id === "u302")).toBe(false);
    expect(authorizedUnits(db, "tl1").some((u) => u.id === "u320")).toBe(true);
    expect(allowedPath(db, "tl1", "/customers/u302")).toBe(false);
    expect(allowedPath(db, "lead1", "/customers/u302")).toBe(true);
    expect(allowedPath(db, "rm1", "/reports")).toBe(false);
    expect(allowedPath(db, "tl1", "/escalations")).toBe(false);
    expect(authorizedUnits(db, "unknown")).toEqual([]);
  });
  it("rejects out-of-team mutation, task assignment and ticket edits by Leadership", () => {
    expect(
      mutate((d) => {
        d.units.find((u) => u.id === "u302")!.tags = ["NRI Investor"];
      }),
    ).toThrow("outside");
    expect(
      mutate((d) => {
        d.tasks[0].assignedRmId = "rm4";
      }),
    ).toThrow("outside");
    expect(
      mutate((d) => {
        d.tickets[0].status = "Closed";
      }, "lead1"),
    ).toThrow("read-only");
    expect(
      mutate((d) => {
        d.tickets[0].priority = "High";
      }),
    ).toThrow("Only the RM");
    expect(
      mutate((d) => {
        d.ledger[0].debit++;
      }, "rm1"),
    ).toThrow("read-only");
  });
  it("requires auditable tag overrides and retains history", () => {
    expect(
      mutate((d) => {
        d.units[0].tags = ["Possible Cancellation"];
      }),
    ).toThrow("audit reason");
    expect(
      mutate((d) => {
        const u = d.units[0];
        d.tagAudits.push({
          id: "audit1",
          unitId: u.id,
          before: [...u.tags],
          after: ["Possible Cancellation"],
          actorId: "tl1",
          role: "TL",
          reason: "Supervisor review",
          date: new Date().toISOString(),
        });
        u.tags = ["Possible Cancellation"];
      }),
    ).not.toThrow();
    expect(
      mutate(
        (d) =>
          d.remarks.push({
            id: "private",
            unitId: "u0",
            ticketId: "TK-1042",
            area: "Ticket",
            author: "Meera Iyer",
            role: "Leadership",
            text: "Cannot write here",
            date: new Date().toISOString(),
          }),
        "lead1",
      ),
    ).toThrow("read-only");
  });
});
describe("management calculations and migration", () => {
  it("deduplicates shared units and reconciles primary RM performance with enterprise and team totals", () => {
    const db = seed(),
      filters = emptyFilters();
    for (const id of ["tl1", "tl2", "lead1"]) {
      const units = authorizedUnits(db, id),
        rows = rmPerformance(db, units, id, filters);
      expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
      expect(rows.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(
        totals(db, attributedUnits(units, id), filters.period).achieved,
        3,
      );
      expect(rows.reduce((s, r) => s + r.overdue, 0)).toBeCloseTo(
        totals(db, attributedUnits(units, id), filters.period).overdue,
        3,
      );
    }
  });
  it("reconciles category targets, project targets and receipt buckets", () => {
    const db = seed(),
      filters = emptyFilters(),
      units = authorizedUnits(db, "lead1"),
      targets = targetRecords(db, "lead1", filters);
    expect(
      targets
        .filter((t) => t.rmId === "rm1")
        .reduce((s, t) => s + t.collection, 0),
    ).toBeCloseTo(242700000, 3);
    expect(
      categoryPerformance(db, units, filters.period).reduce(
        (s, r) => s + r.amount,
        0,
      ),
    ).toBeCloseTo(totals(db, units, filters.period).achieved, 3);
    expect(aging(db, units).reduce((s, n) => s + n, 0)).toBeCloseTo(
      totals(db, units, filters.period).overdue,
      3,
    );
    const selected = { ...filters, rmId: "rm4", projectId: "3" };
    expect(
      filterUnits(units, selected).every(
        (u) => u.rmIds[0] === "rm4" && u.projectId === 3,
      ),
    ).toBe(true);
    expect(targetRecords(db, "tl1", selected)).toEqual([]);
  });
  it("migrates existing records without replacing edits or uploads", () => {
    const old = seed();
    old.remarks[0].text = "Keep my remark";
    old.documents.push({
      id: "upload",
      unitId: "u0",
      name: "signed.pdf",
      bucket: "Handover",
      type: "Customer sign-off",
      date: new Date().toISOString(),
      url: "data:application/pdf;base64,AAAA",
    });
    const { targets, tagAudits, escalations, ...legacy } = old;
    const migrated = migrateDatabase(legacy);
    expect(migrated.remarks[0].text).toBe("Keep my remark");
    expect(migrated.documents[0].url).toBe(old.documents[0].url);
    expect(migrated.ledger.map(({ managementCategory, ...tx }) => tx)).toEqual(
      old.ledger.map(({ managementCategory, ...tx }) => tx),
    );
    expect(migrated.targets.length).toBeGreaterThan(0);
  });
});
describe("escalation review import", () => {
  const row = {
    "Review ID": "REV-001",
    "Unit Number": "B-0902",
    "Customer Code": "C10000",
    Subject: "Escalation review",
  };
  it("previews and imports to a separate register preserving status", () => {
    const db = seed(),
      preview = validateReviews([row], db);
    expect(preview[0].errors).toEqual([]);
    const reviews = commitReviews(
      preview,
      db,
      "lead1",
      "batch",
      new Date().toISOString(),
    );
    expect(reviews[0].status).toBe("Unspecified");
    expect(db.tickets).toHaveLength(75);
    expect(reviews[0].unitId).toBe("u0");
  });
  it("blocks duplicates, unknown units, wrong RM, invalid dates and empty files", () => {
    const db = seed();
    expect(validateReviews([row, row], db)[1].errors).toContain(
      "Duplicate Review ID",
    );
    expect(
      validateReviews([{ ...row, "Unit Number": "missing" }], db)[0].errors,
    ).toContain("Unknown unit / customer");
    expect(
      validateReviews([{ ...row, "Assigned RM": "rm4" }], db)[0].errors,
    ).toContain("Assigned RM must be mapped to the unit");
    expect(
      validateReviews([{ ...row, "Review Date": "bad-date" }], db)[0].errors,
    ).toContain("Review Date is invalid; use YYYY-MM-DD");
    expect(() =>
      commitReviews(
        validateReviews([row, row], db),
        db,
        "lead1",
        "batch",
        "now",
      ),
    ).toThrow();
    expect(() => validateReviews([], db)).toThrow("no data");
  });
});

describe("shared lifecycle mutation prerequisites", () => {
  it("requires appointment and sign-off for handover completion", () => {
    expect(
      mutate((db) => {
        db.handovers.u0 = {
          status: "Completed",
          date: new Date().toISOString(),
        };
      }, "rm1"),
    ).toThrow("sign-off");
    expect(
      mutate((db) => {
        db.documents.push({
          id: "signoff",
          unitId: "u0",
          name: "Signoff.pdf",
          bucket: "Handover",
          type: "Customer sign-off",
          date: new Date().toISOString(),
        });
        db.handovers.u0 = {
          status: "Completed",
          date: new Date().toISOString(),
        };
      }, "rm1"),
    ).not.toThrow();
  });
  it("blocks registration without OC or sale deed", () => {
    expect(
      mutate((db) => {
        db.registrations.u302 = {
          status: "Details Collected",
          date: new Date().toISOString(),
        };
      }, "rm4"),
    ).toThrow("OC");
    expect(
      mutate((db) => {
        db.registrations.u0 = {
          status: "Completed",
          date: new Date().toISOString(),
        };
      }, "rm1"),
    ).toThrow("sale deed");
  });
});
