import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getUser, type Role } from "../../data/users";
export const useSession = create<{
  userId: string | null;
  login: (id: string, role: Role) => void;
  logout: () => void;
}>()(
  persist(
    (set) => ({
      userId: null,
      login: (id, role) => {
        if (getUser(id)?.role !== role)
          throw new Error("Choose a user matching this persona.");
        set({ userId: id });
      },
      logout: () => set({ userId: null }),
    }),
    {
      name: "sobha-demo-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
