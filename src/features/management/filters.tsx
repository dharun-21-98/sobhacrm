import { create } from "zustand";
import {
  emptyFilters,
  filterUnits,
  type ScopeFilters,
} from "../../data/management/queries";
import { useStore } from "../../data/repo";
import { useSession } from "../auth/session";
import { getUser, reportingRms, users } from "../../data/users";
import { authorizedUnits } from "../../data/access";
import { projects } from "../../data/seed";
export const useManagementFilters = create<{
  filters: ScopeFilters;
  set: (patch: Partial<ScopeFilters>) => void;
  reset: () => void;
}>((set) => ({
  filters: emptyFilters(),
  set: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  reset: () => set({ filters: emptyFilters() }),
}));
export function ManagementFilters() {
  const { db } = useStore();
  const { userId } = useSession();
  const user = getUser(userId!)!;
  const { filters, set, reset } = useManagementFilters();
  const rms = reportingRms(user.id).filter(
    (rm) => !filters.tlId || rm.managerId === filters.tlId,
  );
  const units = authorizedUnits(db, user.id);
  function change(patch: Partial<ScopeFilters>) {
    const next = { ...filters, ...patch };
    const projectsInScope = filterUnits(units, {
      ...next,
      projectId: "",
      wing: "",
    });
    if (
      next.projectId &&
      !projectsInScope.some((unit) => unit.projectId === +next.projectId)
    )
      next.projectId = "";
    const wingOptions = filterUnits(units, { ...next, wing: "" });
    if (next.wing && !wingOptions.some((unit) => unit.wing === next.wing))
      next.wing = "";
    set(next);
  }
  const projectUnits = filterUnits(units, {
    ...filters,
    projectId: "",
    wing: "",
  });
  const wings = [
    ...new Set(filterUnits(units, { ...filters, wing: "" }).map((u) => u.wing)),
  ].sort();
  return (
    <div className="management-filter-bar">
      <div>
        <strong>
          {user.role === "Leadership" ? "Enterprise" : "Team"} scope
        </strong>
        <small>
          Primary RM attribution · current portfolio; selected-month activity
        </small>
      </div>
      <label>
        Month
        <input
          aria-label="Management month"
          type="month"
          value={filters.period}
          onChange={(e) => {
            if (e.target.value) change({ period: e.target.value });
          }}
        />
      </label>
      {user.role === "Leadership" && (
        <label>
          Team
          <select
            aria-label="Management team"
            value={filters.tlId}
            onChange={(e) =>
              change({ tlId: e.target.value, rmId: "", wing: "" })
            }
          >
            <option value="">All teams</option>
            {users
              .filter((u) => u.role === "TL")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.team} · {u.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <label>
        Relationship manager
        <select
          aria-label="Management RM"
          value={filters.rmId}
          onChange={(e) => change({ rmId: e.target.value, wing: "" })}
        >
          <option value="">All RMs</option>
          {rms.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Project
        <select
          aria-label="Management project"
          value={filters.projectId}
          onChange={(e) => change({ projectId: e.target.value, wing: "" })}
        >
          <option value="">All projects</option>
          {projects
            .filter((p) => projectUnits.some((u) => u.projectId === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Wing
        <select
          aria-label="Management wing"
          value={filters.wing}
          onChange={(e) => change({ wing: e.target.value })}
        >
          <option value="">All wings</option>
          {wings.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </label>
      <button className="ghost" onClick={reset}>
        Reset scope
      </button>
    </div>
  );
}
