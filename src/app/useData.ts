import { useStore } from "../data/repo";
import { useSession } from "../features/auth/session";
import { getUser, reportingRms } from "../data/users";
import { authorizedUnits } from "../data/access";
import { filterUnits } from "../data/management/queries";
import { useManagementFilters } from "../features/management/filters";
export function useData() {
  const store = useStore();
  const userId = useSession((state) => state.userId)!;
  const user = getUser(userId)!;
  const { filters } = useManagementFilters();
  const authorized = authorizedUnits(store.db, userId);
  const units =
    user.role === "RM" ? authorized : filterUnits(authorized, filters);
  const rmIds = new Set(reportingRms(userId).map((user) => user.id));
  const tasks = store.db.tasks.filter(
    (task) =>
      rmIds.has(task.assignedRmId) &&
      (!filters.rmId ||
        user.role === "RM" ||
        task.assignedRmId === filters.rmId) &&
      (!task.unitId || units.some((unit) => unit.id === task.unitId)) &&
      (!filters.projectId || !!task.unitId) &&
      (!filters.wing || !!task.unitId),
  );
  return { ...store, userId, user, authorized, units, tasks, filters };
}
