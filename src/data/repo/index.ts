import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seed, Database } from "../seed";
import { assertMutation } from "../access";
import { useSession } from "../../features/auth/session";
import { getUser } from "../users";
import { migrateDatabase } from "./migrate";
const defaultColumns = [
  "Unit",
  "Customer",
  "Segment",
  "Tags",
  "Unit Status",
  "Upsell",
  "Site Visit",
  "Latest Remark",
];
export type StoreState = {
  db: Database;
  userId: string;
  columns: string[];
  preferences: Record<string, string[]>;
  update: (fn: (db: Database) => void) => void;
  setUser: (id: string) => void;
  setColumns: (c: string[]) => void;
  reset: () => void;
};
export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      db: seed(),
      userId: "rm1",
      preferences: {},
      columns: defaultColumns,
      update: (fn) =>
        set((state) => {
          const userId = useSession.getState().userId;
          if (!userId) throw new Error("Please log in.");
          const db = structuredClone(state.db);
          fn(db);
          assertMutation(state.db, db, userId);
          return { db };
        }),
      setUser: (userId) =>
        set((state) => {
          if (useSession.getState().userId !== userId || !getUser(userId))
            throw new Error("Login required.");
          return {
            userId,
            preferences: {
              ...state.preferences,
              [state.userId]: state.columns,
            },
            columns: state.preferences[userId] || defaultColumns,
          };
        }),
      setColumns: (columns) => set({ columns }),
      reset: () => set({ db: seed() }),
    }),
    {
      name: "sobha-demo-v1",
      version: 2,
      migrate: (persisted) => {
        const old = persisted as Partial<StoreState>;
        return {
          ...old,
          db: migrateDatabase(old.db || {}),
          preferences: old.preferences || {},
        };
      },
    },
  ),
);
