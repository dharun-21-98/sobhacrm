import type { Database } from "../../data/seed";
import type { Escalation } from "../../data/management/types";
import { config } from "../../data/config";
import { users } from "../../data/users";
export const reviewHeaders = [
  "Review ID",
  "Unit Number",
  "Customer Code",
  "Assigned RM",
  "Category",
  "Subject",
  "Description",
  "Priority",
  "Review Status",
  "Review Date",
  "Manager Remark",
];
export type PreviewRow = {
  row: number;
  values: Record<string, string>;
  unitId: string;
  assignedRmId: string;
  errors: string[];
};
export function validateReviews(
  rows: Record<string, unknown>[],
  db: Database,
): PreviewRow[] {
  if (rows.length > config.importMaxRows)
    throw new Error(`Maximum ${config.importMaxRows} rows per import.`);
  if (!rows.length) throw new Error("The review sheet has no data rows.");
  const ids = new Set(db.escalations.map((e) => e.id));
  return rows.map((raw, index) => {
    const values = Object.fromEntries(
      reviewHeaders.map((key) => [key, String(raw[key] ?? "").trim()]),
    );
    const errors: string[] = [];
    for (const key of ["Review ID", "Unit Number", "Subject"])
      if (!values[key]) errors.push(`${key} is required`);
    if (values["Review ID"]) {
      if (ids.has(values["Review ID"])) errors.push("Duplicate Review ID");
      ids.add(values["Review ID"]);
    }
    const matches = db.units.filter(
      (u) =>
        u.status !== "Unsold" &&
        u.unitNo.toLowerCase() === values["Unit Number"].toLowerCase() &&
        (!values["Customer Code"] ||
          u.code.toLowerCase() === values["Customer Code"].toLowerCase()),
    );
    if (matches.length !== 1)
      errors.push(
        matches.length
          ? "Unit is ambiguous; supply Customer Code"
          : "Unknown unit / customer",
      );
    const unit = matches.length === 1 ? matches[0] : undefined;
    const rm = values["Assigned RM"]
      ? users.find(
          (u) =>
            u.role === "RM" &&
            (u.id === values["Assigned RM"] ||
              u.name.toLowerCase() === values["Assigned RM"].toLowerCase()),
        )
      : users.find((u) => u.id === unit?.rmIds[0]);
    if (!rm || (unit && !unit.rmIds.includes(rm.id)))
      errors.push("Assigned RM must be mapped to the unit");
    if (values.Priority && !["High", "Medium", "Low"].includes(values.Priority))
      errors.push("Priority must be High, Medium or Low");
    if (
      values["Review Date"] &&
      Number.isNaN(Date.parse(values["Review Date"]))
    )
      errors.push("Review Date is invalid; use YYYY-MM-DD");
    return {
      row: index + 2,
      values,
      unitId: unit?.id || "",
      assignedRmId: rm?.id || "",
      errors,
    };
  });
}
export function commitReviews(
  preview: PreviewRow[],
  db: Database,
  uploader: string,
  batchId: string,
  at: string,
): Escalation[] {
  const checked = validateReviews(
    preview.map((row) => row.values),
    db,
  );
  if (checked.some((row) => row.errors.length))
    throw new Error("Resolve all validation errors before import.");
  return checked.map((row) => ({
    id: row.values["Review ID"],
    unitId: row.unitId,
    assignedRmId: row.assignedRmId,
    subject: row.values.Subject,
    description: row.values.Description,
    category: row.values.Category,
    priority: row.values.Priority,
    status: row.values["Review Status"] || "Unspecified",
    reviewDate: row.values["Review Date"],
    managerRemark: row.values["Manager Remark"],
    batchId,
    uploadedBy: uploader,
    uploadedAt: at,
  }));
}
