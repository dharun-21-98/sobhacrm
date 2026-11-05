import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../../app/useData";
import { Kpi, DataList, Select, Toolbar } from "../../components/ui";
import { TaskCreator } from "./Actions";
import { money, date } from "../../lib";
import {
  aging,
  attributedUnits,
  assignedName,
  primaryRm,
  rmPerformance,
  targetRecords,
  totals,
  categoryPerformance,
  segmentRows,
  achieved,
  postedIn,
  collectible,
} from "../../data/management/queries";
import { finance, segment, handoverStage, latest } from "../../data/rules";
import { projects } from "../../data/seed";
import { users } from "../../data/users";
export function ManagementWorkspace() {
  const { db, units, user, filters, tasks } = useData();
  const nav = useNavigate();
  const rmRows = rmPerformance(db, units, user.id, filters),
    summary = totals(db, attributedUnits(units, user.id), filters.period),
    targets = targetRecords(db, user.id, filters);
  const target = targets.reduce((s, t) => s + t.collection, 0);
  const [queue, Q] = useState("Support"),
    [priority, P] = useState(""),
    [seg, S] = useState("");
  const support = db.tickets.filter(
    (t) =>
      units.some((u) => u.id === t.unitId) &&
      (!priority || t.priority === priority) &&
      (!seg ||
        segment(
          db,
          units.find((u) => u.id === t.unitId)!,
        ) === +seg),
  );
  const handover = attributedUnits(units, user.id).filter(
    (u) =>
      db.handovers[u.id]?.status === "Appointment Booked" &&
      postedIn(db.handovers[u.id].date, filters.period),
  ).length;
  const registration = attributedUnits(units, user.id).filter(
    (u) =>
      db.registrations[u.id]?.status === "Completed" &&
      postedIn(db.registrations[u.id].date, filters.period),
  ).length;
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">
            {user.role === "Leadership"
              ? "ENTERPRISE PERSPECTIVE"
              : "TEAM PERSPECTIVE"}
          </div>
          <h1>
            {user.role === "Leadership"
              ? "Enterprise workspace"
              : "Team workspace"}
          </h1>
          <p>
            {user.name} · {user.team} · {filters.period}
          </p>
        </div>
        <TaskCreator />
      </div>
      <div className="welcome-strip">
        <span>
          {rmRows.length} RMs ·{" "}
          {units.filter((u) => u.status === "Active").length} active
          customer/unit rows · {units.length} unique managed accounts
        </span>
        <Link to="/reports">Explore reports →</Link>
      </div>
      <div className="kpi-grid four">
        <Kpi
          label="Collections achievement"
          source="D365 / CMS"
          value={
            target ? `${((summary.achieved / target) * 100).toFixed(1)}%` : "—"
          }
          sub={`${money(summary.achieved)} of ${money(target)}`}
          progress={target ? (summary.achieved / target) * 100 : 0}
        />
        <Kpi
          label="Open support tickets (current)"
          value={
            db.tickets.filter(
              (t) =>
                t.status === "Open" && units.some((u) => u.id === t.unitId),
            ).length
          }
        />
        <Kpi
          label="Handover scheduled (month)"
          source="CRM / CMS"
          value={`${handover} / ${Math.round(targets.reduce((s, t) => s + t.handover, 0))}`}
        />
        <Kpi
          label="Registration completed (month)"
          source="CRM / CMS"
          value={`${registration} / ${Math.round(targets.reduce((s, t) => s + t.registration, 0))}`}
        />
      </div>
      <div className="kpi-grid">
        <Kpi
          label="Overdue exposure (current)"
          source="D365"
          value={money(summary.overdue)}
        />
        <Kpi
          label="Outstanding (current)"
          source="D365"
          value={money(summary.outstanding)}
        />
        <Kpi
          label="High-risk accounts (Seg 3–4 / PC)"
          value={
            units.filter(
              (u) =>
                segment(db, u) >= 3 || u.tags.includes("Possible Cancellation"),
            ).length
          }
        />
      </div>
      <DataList
        name="RM performance & capacity"
        rows={rmRows.map((r) => ({
          _id: r.rm.id,
          RM: r.rm.name,
          Towers: r.towers,
          "Mapped load": r.mapped.length,
          Capacity: r.rm.capacity || 300,
          Utilization: `${((r.mapped.length / (r.rm.capacity || 300)) * 100).toFixed(1)}%`,
          Load:
            r.mapped.length > (r.rm.capacity || 300)
              ? "Over capacity"
              : "Within capacity",
          "Attributed accounts": r.owned.length,
          Target: money(r.target),
          Achieved: money(r.amount),
          "Achievement %": r.target
            ? `${((r.amount / r.target) * 100).toFixed(1)}%`
            : "—",
          Overdue: money(r.overdue),
          "Open tickets": r.tickets.filter((t) => t.status === "Open").length,
        }))}
      />
      <DataList
        name="Aging concentration by RM"
        rows={rmRows.map((r) => ({
          _id: r.rm.id,
          RM: r.rm.name,
          "0–30 days": money(r.aging[0]),
          "31–90 days": money(r.aging[1]),
          "90+ days": money(r.aging[2]),
          Overdue: money(r.overdue),
        }))}
        onRow={(r) => nav(`/collections?rm=${r._id}&view=Overdue`)}
      />
      {user.role === "Leadership" && <LeadershipInsights />}
      <section className="panel">
        <div className="section-heading">
          <h2>Team tasks (current)</h2>
          <Link to="/workspace/tasks">View all tasks →</Link>
        </div>
        <DataList
          name="Assigned task preview"
          rows={tasks
            .slice(0, 5)
            .map((task) => ({
              _id: task.unitId,
              Task: task.title,
              "Assigned RM": users.find((user) => user.id === task.assignedRmId)
                ?.name,
              Unit:
                units.find((unit) => unit.id === task.unitId)?.unitNo || "N/A",
              Status: task.status,
              "Given by": task.givenBy,
            }))}
          onRow={(row) => {
            if (row._id) nav(`/customers/${row._id}`);
          }}
        />
      </section>
      <DataList
        name="Team customer drill-down"
        rows={units.map((u) => {
          const f = finance(db, u);
          return {
            _id: u.id,
            Customer: u.name,
            Unit: u.unitNo,
            "Assigned RM": assignedName(u),
            Demanded: money(f.demanded),
            Collected: money(f.collected),
            "Days overdue": f.age,
          };
        })}
        onRow={(r) => nav(`/customers/${r._id}`)}
      />
      <section className="panel">
        <h2>Operational queues</h2>
        <div className="toolbar">
          <Select
            value={queue}
            onChange={Q}
            options={["Support", "Handover", "Registration"]}
          />
          {queue === "Support" && (
            <>
              <Select
                label="Priority"
                value={priority}
                onChange={P}
                options={["High", "Medium", "Low"]}
              />
              <Select
                label="Segment"
                value={seg}
                onChange={S}
                options={["1", "2", "3", "4"]}
              />
            </>
          )}
        </div>
        {queue === "Support" ? (
          <DataList
            name="Support queue"
            rows={support.map((t) => {
              const u = units.find((u) => u.id === t.unitId)!;
              return {
                _id: t.id,
                Ticket: t.id,
                Unit: u.unitNo,
                Customer: u.name,
                "Assigned RM": assignedName(u),
                Priority: t.priority || "Unassigned",
                Segment: segment(db, u),
                Status: t.status,
              };
            })}
            onRow={(r) => nav(`/tickets/${r._id}`)}
          />
        ) : (
          <DataList
            name={`${queue} queue`}
            rows={units
              .filter((u) =>
                queue === "Handover" ? u.ready : !!projects[u.projectId].oc,
              )
              .map((u) => ({
                _id: u.id,
                Unit: u.unitNo,
                Customer: u.name,
                Project: projects[u.projectId].name,
                "Assigned RM": assignedName(u),
                Status:
                  queue === "Handover"
                    ? handoverStage(db, u)
                    : db.registrations[u.id]?.status || "Pending",
              }))}
            onRow={(r) => nav(`/handover-registration/${r._id}`)}
          />
        )}
      </section>
    </>
  );
}
export function LeadershipInsights() {
  const { db, units, user, filters } = useData();
  const nav = useNavigate();
  const target = targetRecords(db, user.id, filters);
  return (
    <>
      <h2 className="section-title">Enterprise insights</h2>
      <DataList
        name="Active customers by segment"
        rows={segmentRows(
          db,
          units.filter((u) => u.status === "Active"),
          filters.period,
        ).map((r) => ({
          _segment: r.segment,
          Segment: `Segment ${r.segment}`,
          "Active accounts": r.units.length,
          Collected: money(r.achieved),
          Overdue: money(r.overdue),
          Outstanding: money(r.outstanding),
        }))}
        onRow={(r) => nav(`/customers?segment=${r._segment}`)}
      />
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Collection targets by category</h2>
          <p className="muted">
            PC first; allocated current-month billing otherwise New Billing /
            Regular.
          </p>
          <DataList
            name="Category targets"
            rows={categoryPerformance(db, units, filters.period).map((c) => {
              const amount = target
                .filter((t) => t.category === c.category)
                .reduce((s, t) => s + t.collection, 0);
              return {
                Category: c.category,
                Target: money(amount),
                Achieved: money(c.amount),
                Variance: money(c.amount - amount),
              };
            })}
          />
        </section>
        <section className="panel">
          <h2>Project target vs achieved</h2>
          <DataList
            name="Project performance"
            rows={projects
              .filter((p) => units.some((u) => u.projectId === p.id))
              .map((p) => {
                const group = units.filter((u) => u.projectId === p.id);
                return {
                  Project: p.name,
                  Target: money(
                    target
                      .filter((t) => t.projectId === p.id)
                      .reduce((s, t) => s + t.collection, 0),
                  ),
                  Achieved: money(achieved(db, group, filters.period)),
                  Overdue: money(totals(db, group, filters.period).overdue),
                };
              })}
          />
        </section>
      </div>
      <DataList
        name="Segment-wise performance & receivables"
        rows={segmentRows(db, units, filters.period).map((r) => ({
          _segment: r.segment,
          Segment: `Segment ${r.segment}`,
          Accounts: r.units.length,
          Achieved: money(r.achieved),
          Receivables: money(r.outstanding),
          Overdue: money(r.overdue),
        }))}
        onRow={(r) => nav(`/customers?segment=${r._segment}`)}
      />
      <DataList
        name="Upsell conversion by RM"
        rows={rmPerformance(db, units, user.id, filters).map((r) => {
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
              ? `${((cohort.filter((x) => x.status === "Closed").length / cohort.length) * 100).toFixed(1)}%`
              : "—",
          };
        })}
      />
      <div className="management-links">
        <Link to="/collections?view=PC">Possible Cancellation oversight →</Link>
        <Link to="/collections?view=Interest">
          Interest-applied oversight →
        </Link>
        <Link to="/tickets">Read-only ticket oversight →</Link>
        <Link to="/escalations">Escalation review register →</Link>
      </div>
    </>
  );
}
export function RemarksOverview() {
  const { db, units } = useData();
  const nav = useNavigate();
  const [q, Q] = useState(""),
    [area, A] = useState("");
  const rows = db.remarks
    .filter(
      (r) =>
        r.area !== "External" &&
        units.some((u) => u.id === r.unitId) &&
        (!area || r.area === area) &&
        `${r.text} ${r.author}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel">
      <h2>Team remarks overview</h2>
      <Toolbar searchLabel="Search remark history" search={q} setSearch={Q}>
        <Select
          label="Area"
          value={area}
          onChange={A}
          options={[
            "Unit",
            "Collections",
            "Handover",
            "Registration",
            "Ticket",
          ]}
        />
      </Toolbar>
      <DataList
        name="Remarks overview"
        rows={rows.map((r) => ({
          _id: r.unitId,
          Unit: units.find((u) => u.id === r.unitId)!.unitNo,
          "Assigned RM": assignedName(units.find((u) => u.id === r.unitId)!),
          Author: r.author,
          Role: r.role,
          Area: r.area,
          Remark: r.text,
          Date: date(r.date, true),
        }))}
        onRow={(r) => nav(`/customers/${r._id}`)}
      />
    </section>
  );
}
export function TowerSummary() {
  const { db, units: visibleUnits, user, filters } = useData();
  const units = attributedUnits(visibleUnits, user.id);
  const targets = targetRecords(db, user.id, filters);
  const groups = [...new Set(units.map((u) => `${u.projectId}:${u.wing}`))];
  return (
    <section className="panel">
      <h2>Tower collections summary</h2>
      <p className="muted">
        Collectible = unpaid demands due by selected month end. Explicit mock
        CMS targets; current outstanding.
      </p>
      <DataList
        name="Tower summary"
        rows={groups.map((key) => {
          const [projectId, wing] = key.split(":");
          const group = units.filter(
            (u) => u.projectId === +projectId && u.wing === wing,
          );
          const target = targets.filter(
            (t) => t.projectId === +projectId && t.wing === wing,
          );
          return {
            Project: projects[+projectId].name,
            Wing: wing,
            Accounts: group.length,
            Outstanding: money(totals(db, group, filters.period).outstanding),
            Collectible: money(
              group.reduce((s, u) => s + collectible(db, u, filters.period), 0),
            ),
            Target: target.length
              ? money(target.reduce((s, t) => s + t.collection, 0))
              : "Not configured",
          };
        })}
      />
    </section>
  );
}
