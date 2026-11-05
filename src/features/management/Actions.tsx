import { useState } from "react";
import { useData } from "../../app/useData";
import { reportingRms } from "../../data/users";
import { type Unit, iso } from "../../data/seed";
import { config } from "../../data/config";
import { createId } from "../../lib/id";
import { date } from "../../lib";
import { Modal, Chip } from "../../components/ui";
export function TaskCreator() {
  const { user, units, update } = useData();
  const [open, O] = useState(false),
    [rm, R] = useState(""),
    [unit, U] = useState(""),
    [error, E] = useState(""),
    [message, M] = useState("");
  if (user.role === "RM") return null;
  const rms = reportingRms(user.id);
  return (
    <>
      <button
        className="primary"
        onClick={() => {
          O(true);
          E("");
        }}
      >
        + Create RM task
      </button>
      {message && (
        <span role="status" className="action-status">
          {message}
        </span>
      )}
      {open && (
        <Modal title="Create unit-level task" close={() => O(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const values = new FormData(e.currentTarget);
              try {
                update((db) => {
                  db.tasks.unshift({
                    id: createId(),
                    assignedRmId: rm,
                    unitId: unit,
                    title: String(values.get("title")).trim(),
                    description: String(values.get("description")).trim(),
                    givenBy: `${user.name} · ${user.role}`,
                    createdById: user.id,
                    status: "Open",
                    priority: String(values.get("priority")),
                    date: iso(),
                    dueDate: String(values.get("dueDate")),
                  });
                  db.notifications.unshift({
                    id: createId(),
                    userId: rm,
                    text: `Task assigned: ${String(values.get("title")).trim()}`,
                    link: "/workspace/tasks",
                    isRead: false,
                  });
                });
                O(false);
                M("Task assigned to RM.");
              } catch (err) {
                E((err as Error).message);
              }
            }}
          >
            <label>
              Assigned RM
              <select
                aria-label="Task RM"
                required
                value={rm}
                onChange={(e) => {
                  R(e.target.value);
                  U("");
                }}
              >
                <option value="">Select RM</option>
                {rms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Linked unit
              <select
                aria-label="Task unit"
                required
                value={unit}
                onChange={(e) => U(e.target.value)}
              >
                <option value="">Select mapped unit</option>
                {units
                  .filter((u) => u.rmIds.includes(rm))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNo} · {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Title
              <input name="title" required maxLength={180} />
            </label>
            <label>
              Description
              <textarea name="description" required />
            </label>
            <label>
              Priority (optional)
              <select name="priority">
                <option value="">Not specified</option>
                {["High", "Medium", "Low"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Due date (optional)
              <input name="dueDate" type="date" />
            </label>
            {error && (
              <p role="alert" className="danger">
                {error}
              </p>
            )}
            <button className="primary">Assign task</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function TagEditor({ unit }: { unit: Unit }) {
  const { db, user, update } = useData();
  const [open, O] = useState(false),
    [tags, T] = useState<string[]>([]),
    [reason, R] = useState(""),
    [error, E] = useState("");
  return (
    <>
      <button
        className="text-button"
        onClick={() => {
          T([...unit.tags]);
          R("");
          E("");
          O(true);
        }}
      >
        {user.role === "RM" ? "Edit tags" : "Override tags"}
      </button>
      {open && (
        <Modal
          title={
            user.role === "RM"
              ? "Edit behavioral tags"
              : "Supervisory tag override"
          }
          close={() => O(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                update((d) => {
                  const target = d.units.find((u) => u.id === unit.id)!;
                  const before = [...target.tags];
                  target.tags = tags;
                  d.tagAudits.push({
                    id: createId(),
                    unitId: unit.id,
                    before,
                    after: [...tags],
                    actorId: user.id,
                    role: user.role,
                    reason: reason.trim() || "RM tag update",
                    date: iso(),
                  });
                });
                O(false);
              } catch (err) {
                E((err as Error).message);
              }
            }}
          >
            {config.tags.map((tag) => (
              <label className="tag-choice" key={tag}>
                <input
                  type="checkbox"
                  checked={tags.includes(tag)}
                  onChange={() =>
                    T(
                      tags.includes(tag)
                        ? tags.filter((t) => t !== tag)
                        : [...tags, tag],
                    )
                  }
                />
                {tag}
              </label>
            ))}
            <label>
              Reason {user.role === "RM" ? "(optional)" : "(required)"}
              <textarea
                aria-label="Tag override reason"
                required={user.role !== "RM"}
                value={reason}
                onChange={(e) => R(e.target.value)}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary">Save tags</button>
          </form>
          <h3>Tag audit history</h3>
          {db.tagAudits
            .filter((a) => a.unitId === unit.id)
            .slice()
            .reverse()
            .map((a) => (
              <div className="remark" key={a.id}>
                <Chip>{a.role}</Chip>
                <p>
                  {a.before.join(", ") || "No tags"} →{" "}
                  {a.after.join(", ") || "No tags"}
                </p>
                <p>{a.reason}</p>
                <small>
                  {a.actorId} · {date(a.date, true)}
                </small>
              </div>
            ))}
        </Modal>
      )}
    </>
  );
}
