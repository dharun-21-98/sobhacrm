import { users } from "../../data/users";
import { useStore } from "../../data/repo";
import { latest } from "../../data/rules";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useData } from "../../app/useData";
import { config } from "../../data/config";
import { createId } from "../../lib/id";
import { iso } from "../../data/seed";
import { date, exportRows } from "../../lib";
import { DataList, Modal, Toolbar, Select } from "../../components/ui";
import {
  validateReviews,
  commitReviews,
  reviewHeaders,
  type PreviewRow,
} from "./import";
import { RemarkForm } from "../../components/RemarkForm";
export function Escalations() {
  const { db, units, user, update } = useData();
  const nav = useNavigate();
  const [preview, P] = useState<PreviewRow[] | null>(null),
    [error, E] = useState(""),
    [message, M] = useState(""),
    [q, Q] = useState(""),
    [status, S] = useState(""),
    [remark, R] = useState("");
  const visible = db.escalations.filter(
    (e) =>
      units.some((u) => u.id === e.unitId) &&
      (!status || e.status === status) &&
      `${e.id} ${e.subject} ${e.description} ${units.find((unit) => unit.id === e.unitId)?.unitNo} ${units.find((unit) => unit.id === e.unitId)?.name}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  async function read(file: File) {
    P(null);
    E("");
    M("");
    try {
      if (!/\.(xlsx|csv)$/i.test(file.name))
        throw new Error("Choose an .xlsx or .csv review sheet.");
      if (file.size > config.importMaxBytes)
        throw new Error("Maximum file size is 5 MB.");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      P(validateReviews(raw, db));
    } catch (err) {
      E((err as Error).message);
    }
  }
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">LEADERSHIP REVIEW</div>
          <h1>Escalation review register</h1>
          <p>Imported reviews remain separate from native tickets.</p>
        </div>
        <button
          onClick={() =>
            exportRows(
              [
                Object.fromEntries(
                  reviewHeaders.map((key) => [
                    key,
                    key === "Review ID"
                      ? "REV-DEMO-001"
                      : key === "Unit Number"
                        ? "B-0902"
                        : key === "Customer Code"
                          ? "C10000"
                          : key === "Subject"
                            ? "Example escalation review"
                            : "",
                  ]),
                ),
              ],
              "Sobha-review-template",
            )
          }
        >
          Download sample template
        </button>
      </div>
      <div className="panel">
        <h2>Upload review sheet</h2>
        <p className="muted">
          Proposed demo schema · .xlsx / .csv · 5 MB · 5,000 rows. Supply
          Customer Code when a unit number is ambiguous.
        </p>
        <input
          aria-label="Review sheet"
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void read(file);
            e.target.value = "";
          }}
        />
        {error && (
          <p role="alert" className="danger">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </div>
      {preview && (
        <section className="panel">
          <h2>Import preview</h2>
          <p>
            {preview.length} rows ·{" "}
            {preview.filter((p) => p.errors.length).length} rows with validation
            errors
          </p>
          <DataList
            name="Review preview"
            rows={preview.map((p) => ({
              Row: p.row,
              ...p.values,
              Validation: p.errors.join("; ") || "Valid",
            }))}
          />
          <div className="form-actions">
            <button onClick={() => P(null)}>Cancel import</button>
            <button
              className="primary"
              disabled={preview.some((p) => p.errors.length > 0)}
              onClick={() => {
                try {
                  update((database) =>
                    database.escalations.push(
                      ...commitReviews(
                        preview,
                        database,
                        user.id,
                        createId(),
                        iso(),
                      ),
                    ),
                  );
                  M(`${preview.length} reviews imported.`);
                  P(null);
                } catch (err) {
                  E((err as Error).message);
                }
              }}
            >
              Confirm import
            </button>
          </div>
        </section>
      )}
      <Toolbar
        search={q}
        setSearch={Q}
        reset={() => {
          Q("");
          S("");
        }}
      >
        <Select
          label="Review status"
          value={status}
          onChange={S}
          options={[...new Set(db.escalations.map((e) => e.status))]}
        />
      </Toolbar>
      <DataList
        name="Imported reviews"
        rows={visible.map((e) => ({
          _id: e.unitId,
          Review: e.id,
          Unit: units.find((u) => u.id === e.unitId)!.unitNo,
          Subject: e.subject,
          "Assigned RM":
            users.find((user) => user.id === e.assignedRmId)?.name ||
            e.assignedRmId,
          Priority: e.priority || "—",
          Status: e.status,
          "Review date": e.reviewDate || "—",
          "Manager remark": e.managerRemark,
          "Uploaded by": e.uploadedBy,
          "Imported on": date(e.uploadedAt, true),
        }))}
        onRow={(r) => nav(`/customers/${r._id}`)}
        extra={(r) => (
          <button onClick={() => R(String(r.Review))}>
            + Manager guidance
          </button>
        )}
      />
      {remark && (
        <Modal title="Manager guidance" close={() => R("")}>
          <RemarkForm
            unitId={
              db.escalations.find((review) => review.id === remark)!.unitId
            }
            done={() => {
              const record = db.escalations.find(
                (review) => review.id === remark,
              )!;
              const guidance = latest(
                useStore.getState().db,
                record.unitId,
                "Unit",
              );
              if (guidance)
                update((database) => {
                  database.escalations.find(
                    (review) => review.id === remark,
                  )!.managerRemark = guidance.text;
                });
              R("");
            }}
          />
        </Modal>
      )}
    </>
  );
}
