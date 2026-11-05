import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useData } from "../../app/useData";
import { DataList } from "../../components/ui";
import { money, d1 } from "../../lib";
import { projects } from "../../data/seed";
import {
  rmPerformance,
  targetRecords,
  segmentRows,
  postedIn,
  assignedName,
  aging,
} from "../../data/management/queries";
import { finance, handoverStage } from "../../data/rules";
export function Reports() {
  const { db, units, user, filters } = useData();
  const nav = useNavigate();
  const [report, R] = useState("Targets vs current achievement");
  const catalog = [
    "Targets vs current achievement",
    "RM performance and capacity",
    "Aging and overdue exposure",
    "Handover / registration progress",
    "Support queue",
    "Segment receivables / performance",
    ...(user.role === "Leadership"
      ? ["Upsell conversion", "Escalation review register"]
      : []),
  ];
  const performance = rmPerformance(db, units, user.id, filters);
  const target = targetRecords(db, user.id, filters);
  let rows: Record<string, unknown>[] = [];
  if (report === "Targets vs current achievement")
    rows = performance.map((r) => ({
      RM: r.rm.name,
      Target: r.target,
      Achieved: r.amount,
      Variance: r.amount - r.target,
      "Achievement %": r.target ? (r.amount / r.target) * 100 : 0,
    }));
  if (report === "RM performance and capacity")
    rows = performance.map((r) => ({
      RM: r.rm.name,
      "Mapped load": r.mapped.length,
      Capacity: r.rm.capacity || 300,
      "Attributed accounts": r.owned.length,
      Achieved: r.amount,
      Overdue: r.overdue,
      "Open tickets": r.tickets.filter((t) => t.status === "Open").length,
    }));
  if (report === "Aging and overdue exposure")
    rows = performance.map((r) => ({
      RM: r.rm.name,
      "0–30": r.aging[0],
      "31–90": r.aging[1],
      "90+": r.aging[2],
      Overdue: r.overdue,
    }));
  if (report === "Handover / registration progress")
    rows = units.map((u) => ({
      _unit: u.id,
      Unit: u.unitNo,
      Customer: u.name,
      "Assigned RM": assignedName(u),
      Project: projects[u.projectId].name,
      Handover: handoverStage(db, u),
      "Scheduled in month":
        db.handovers[u.id]?.status === "Appointment Booked" &&
        postedIn(db.handovers[u.id].date, filters.period)
          ? "Yes"
          : "No",
      Registration: db.registrations[u.id]?.status || "Pending",
      "Registration completed in month":
        db.registrations[u.id]?.status === "Completed" &&
        postedIn(db.registrations[u.id].date, filters.period)
          ? "Yes"
          : "No",
    }));
  if (report === "Support queue")
    rows = db.tickets
      .filter((t) => units.some((u) => u.id === t.unitId))
      .map((t) => ({
        _ticket: t.id,
        Ticket: t.id,
        Unit: units.find((u) => u.id === t.unitId)!.unitNo,
        Department: t.team || "Not configured",
        Priority: t.priority || "Unassigned",
        Status: t.status,
        SLA: t.slaDueAt || "SLA not configured",
      }));
  if (report === "Segment receivables / performance")
    rows = segmentRows(db, units, filters.period).map((r) => ({
      Segment: r.segment,
      Accounts: r.units.length,
      Achieved: r.achieved,
      Overdue: r.overdue,
      Outstanding: r.outstanding,
    }));
  if (report === "Upsell conversion")
    rows = performance.map((r) => {
      const cohort = db.upsells.filter(
        (x) =>
          r.owned.some((u) => u.id === x.unitId) &&
          postedIn(x.date, filters.period),
      );
      return {
        RM: r.rm.name,
        Requests: cohort.length,
        Initiated: cohort.filter((x) => x.status === "Initiated").length,
        Closed: cohort.filter((x) => x.status === "Closed").length,
        Rejected: cohort.filter((x) => x.status === "Rejected").length,
        Cancelled: cohort.filter((x) => x.status === "Cancelled").length,
        Conversion: cohort.length
          ? (cohort.filter((x) => x.status === "Closed").length /
              cohort.length) *
            100
          : "—",
      };
    });
  if (report === "Escalation review register")
    rows = db.escalations
      .filter((e) => units.some((u) => u.id === e.unitId))
      .map((e) => ({
        _unit: e.unitId,
        "Review ID": e.id,
        Unit: units.find((u) => u.id === e.unitId)!.unitNo,
        Subject: e.subject,
        Status: e.status,
        "Manager remark": e.managerRemark,
      }));
  function download() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(([key]) => !key.startsWith("_")),
          ),
        ),
      ),
      "Results",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          Report: report,
          Persona: user.role,
          User: user.name,
          Month: filters.period,
          Team: filters.tlId || "All authorized teams",
          RM: filters.rmId || "All authorized RMs",
          Project:
            filters.projectId === ""
              ? "All authorized projects"
              : projects[+filters.projectId].name,
          Wing: filters.wing || "All wings",
          Source: "Mock D365 / CMS / CRM",
          Freshness: `As of ${d1()} (D-1)`,
          Attribution: "Primary mapped RM",
          State:
            "Outstanding, aging, capacity and queue status are current; receipt / lifecycle activity uses selected month",
          Target: target.reduce((sum, t) => sum + t.collection, 0),
        },
      ]),
      "Scope and sources",
    );
    XLSX.writeFile(
      wb,
      `Sobha-${report.replaceAll("/", "-")}-${filters.period}.xlsx`,
    );
  }
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">PERFORMANCE, MADE VISIBLE</div>
          <h1>Reports & dashboards</h1>
          <p>
            Defined management reports · primary RM attribution ·{" "}
            {filters.period}
          </p>
        </div>
        <button className="primary" onClick={download}>
          Download report with scope
        </button>
      </div>
      <div className="report-catalog">
        {catalog.map((name) => (
          <button
            key={name}
            className={name === report ? "selected" : ""}
            onClick={() => R(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="welcome-strip">
        D365 / CMS / CRM · As of {d1()} (D-1) · Currency columns are rupees for
        Excel analysis
      </div>
      <DataList
        name={report}
        rows={rows}
        onRow={(row) => {
          if (row._unit) nav(`/customers/${row._unit}`);
          if (row._ticket) nav(`/tickets/${row._ticket}`);
        }}
      />
    </>
  );
}
